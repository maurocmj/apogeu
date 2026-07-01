import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("Health Connect Sync Service - Booted!");

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let token = authHeader.replace(/^[Bb]earer\s+/, "").trim();
    // Strip wrapping quotes if present
    if (token.startsWith('"') && token.endsWith('"')) {
      token = token.slice(1, -1);
    }
    
    let userId: string;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (uuidRegex.test(token)) {
      // Authenticate using health_sync_token
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('health_sync_token', token)
        .maybeSingle();

      if (profileError || !userProfile) {
        return new Response(JSON.stringify({ error: "Unauthorized: Invalid Health Sync Token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      userId = userProfile.id;
    } else {
      // Fallback: Authenticate using standard JWT (for simulation/web calls)
      try {
        const parts = token.split('.');
        if (parts.length !== 3) throw new Error("Invalid JWT parts count: " + parts.length);
        const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(payloadBase64));
        userId = payload.sub;

        // Verify the user actually exists in the database
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();

        if (profileError || !userProfile) {
          throw new Error("User profile not found in database");
        }
      } catch (err) {
        return new Response(JSON.stringify({ 
          error: "Invalid token or user not found", 
          details: err.message, 
          token_preview: token.substring(0, 20) + "..." 
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    const body = await req.json();
    const date = body.date || new Date().toISOString().split('T')[0];
    
    // We support both the direct simulation format and the raw Android app format!
    let sleep_hours = body.sleep_hours;
    let sleep_quality = body.sleep_quality;
    let stress_level = body.stress_level;
    let mood = body.mood;
    let notes = body.notes;

    // 1. Parse Sleep from Android App format
    if (body.sleep && Array.isArray(body.sleep) && body.sleep.length > 0) {
      let totalSleepSeconds = 0;
      let deepSleepSeconds = 0;
      let remSleepSeconds = 0;
      let totalStagesSeconds = 0;

      for (const session of body.sleep) {
        totalSleepSeconds += session.duration_seconds || 0;
        if (session.stages && Array.isArray(session.stages)) {
          for (const stage of session.stages) {
            // Stage mapping in Health Connect (typically):
            // 5 = deep, 6 = rem, 4 = light, 1 = awake
            const stageNum = Number(stage.stage);
            if (stageNum === 5) deepSleepSeconds += stage.duration_seconds || 0;
            if (stageNum === 6) remSleepSeconds += stage.duration_seconds || 0;
            totalStagesSeconds += stage.duration_seconds || 0;
          }
        }
      }

      if (totalSleepSeconds > 0) {
        sleep_hours = parseFloat((totalSleepSeconds / 3600).toFixed(1));
        
        // Estimate sleep quality:
        // A simple rule of thumb: deep + REM sleep should ideally be around 40-50% of total sleep time.
        if (totalStagesSeconds > 0) {
          const restorativeRatio = (deepSleepSeconds + remSleepSeconds) / totalStagesSeconds;
          // Map restorativeRatio (typically 0.15 to 0.60) to sleep quality (50 to 100)
          sleep_quality = Math.max(50, Math.min(100, Math.round(50 + (restorativeRatio * 100))));
        } else {
          // If no stages, default to a high-quality estimate based on duration (ideal is 8 hours)
          const idealDiff = Math.abs(sleep_hours - 8.0);
          sleep_quality = Math.max(60, Math.min(95, Math.round(95 - (idealDiff * 10))));
        }
      }
    }

    // 2. Parse Stress / HRV from Android App format
    if (body.heart_rate_variability && Array.isArray(body.heart_rate_variability) && body.heart_rate_variability.length > 0) {
      let totalRmssd = 0;
      let count = 0;
      
      for (const entry of body.heart_rate_variability) {
        const rmssd = entry.rmssd_millis ?? entry.avg;
        if (rmssd !== undefined && rmssd !== null) {
          totalRmssd += rmssd;
          count++;
        }
      }

      if (count > 0) {
        const avgRmssd = totalRmssd / count;
        // Map RMSSD (typically 20 - 100ms) to stress level (15 - 90)
        // High RMSSD = Low stress, Low RMSSD = High stress
        stress_level = Math.max(15, Math.min(90, Math.round(100 - avgRmssd)));
      }
    }

    // 3. Parse Heart Rate from Android App format
    let heart_rate_avg: number | undefined;
    let heart_rate_min: number | undefined;
    let heart_rate_max: number | undefined;
    if (body.heart_rate && Array.isArray(body.heart_rate) && body.heart_rate.length > 0) {
      let totalBpm = 0;
      let count = 0;
      let minBpm = Infinity;
      let maxBpm = -Infinity;

      for (const entry of body.heart_rate) {
        const bpm = entry.bpm ?? entry.avg;
        if (bpm !== undefined && bpm !== null) {
          totalBpm += bpm;
          count++;
          const currentMin = entry.min ?? bpm;
          const currentMax = entry.max ?? bpm;
          if (currentMin < minBpm) minBpm = currentMin;
          if (currentMax > maxBpm) maxBpm = currentMax;
        }
      }

      if (count > 0) {
        heart_rate_avg = Math.round(totalBpm / count);
        heart_rate_min = minBpm;
        heart_rate_max = maxBpm;
      }
    }

    // Set mood and notes based on parsed values if they are from Android app
    if (!mood && (sleep_hours !== undefined || stress_level !== undefined || heart_rate_avg !== undefined)) {
      if (stress_level !== undefined && stress_level > 65) {
        mood = "Cansado / Estressado";
      } else if (sleep_quality !== undefined && sleep_quality > 85) {
        mood = "Excelente / Produtivo";
      } else {
        mood = "Bem / Disposto";
      }
    }

    if (!notes) {
      if (body.sleep || body.heart_rate_variability || body.heart_rate) {
        const sources = [];
        if (body.sleep && body.sleep.length > 0) sources.push("Sono");
        if (body.heart_rate_variability && body.heart_rate_variability.length > 0) sources.push("HRV/Estresse");
        if (body.heart_rate && body.heart_rate.length > 0) sources.push("Batimentos Cardíacos");
        if (sources.length > 0) {
          notes = `Sincronizado automaticamente via Health Connect (${sources.join(" e ")}).`;
        }
      }
    }

    // Fetch current metrics for that day to merge
    const { data: existing } = await supabase
      .from('daily_habits')
      .select('metrics')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();

    const existingMetrics = existing?.metrics || {};

    // Merge heart rate metrics intelligently
    let merged_hr_avg = heart_rate_avg;
    let merged_hr_min = heart_rate_min;
    let merged_hr_max = heart_rate_max;

    if (existingMetrics.heart_rate_avg !== undefined && heart_rate_avg !== undefined) {
      merged_hr_avg = Math.round((Number(existingMetrics.heart_rate_avg) + heart_rate_avg) / 2);
    } else if (existingMetrics.heart_rate_avg !== undefined) {
      merged_hr_avg = Number(existingMetrics.heart_rate_avg);
    }

    if (existingMetrics.heart_rate_min !== undefined && heart_rate_min !== undefined) {
      merged_hr_min = Math.min(Number(existingMetrics.heart_rate_min), heart_rate_min);
    } else if (existingMetrics.heart_rate_min !== undefined) {
      merged_hr_min = Number(existingMetrics.heart_rate_min);
    }

    if (existingMetrics.heart_rate_max !== undefined && heart_rate_max !== undefined) {
      merged_hr_max = Math.max(Number(existingMetrics.heart_rate_max), heart_rate_max);
    } else if (existingMetrics.heart_rate_max !== undefined) {
      merged_hr_max = Number(existingMetrics.heart_rate_max);
    }

    const newMetrics = {
      ...existingMetrics,
      ...(sleep_hours !== undefined && { sleep_hours }),
      ...(sleep_quality !== undefined && { sleep_quality }),
      ...(stress_level !== undefined && { stress_level }),
      ...(merged_hr_avg !== undefined && { heart_rate_avg: merged_hr_avg }),
      ...(merged_hr_min !== undefined && { heart_rate_min: merged_hr_min }),
      ...(merged_hr_max !== undefined && { heart_rate_max: merged_hr_max }),
      ...(mood !== undefined && { mood }),
      ...(notes !== undefined && { notes }),
      sync_source: 'google_health_connect',
      synced_at: new Date().toISOString()
    };

    const { error: upsertError } = await supabase
      .from('daily_habits')
      .upsert({
        user_id: userId,
        date: date,
        metrics: newMetrics
      }, { onConflict: 'user_id, date' });

    if (upsertError) throw upsertError;

    // Log a health event for Event Sourcing
    await supabase.from('health_events').insert({
      user_id: userId,
      event_type: 'DAILY_METRICS_SYNCED',
      event_date: new Date().toISOString(),
      payload: {
        date,
        source: 'google_health_connect',
        metrics: {
          sleep_hours,
          sleep_quality,
          stress_level
        },
        raw_data: {
          steps: body.steps || [],
          heart_rate: body.heart_rate || [],
          heart_rate_variability: body.heart_rate_variability || [],
          sleep: body.sleep || [],
          distance: body.distance || [],
          active_calories: body.active_calories || []
        }
      }
    });

    return new Response(JSON.stringify({ success: true, message: "Metrics synchronized successfully", date }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Error in health connect sync:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
