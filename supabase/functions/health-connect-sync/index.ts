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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace("Bearer ", "");
    let userId: string;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error("Invalid JWT");
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(payloadBase64));
      userId = payload.sub;
    } catch (err) {
      return new Response(JSON.stringify({ error: "Invalid JWT token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const date = body.date || new Date().toISOString().split('T')[0];
    
    // Fetch current metrics for that day to merge
    const { data: existing } = await supabase
      .from('daily_habits')
      .select('metrics')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();

    const existingMetrics = existing?.metrics || {};

    const newMetrics = {
      ...existingMetrics,
      ...(body.sleep_hours !== undefined && { sleep_hours: body.sleep_hours }),
      ...(body.sleep_quality !== undefined && { sleep_quality: body.sleep_quality }),
      ...(body.stress_level !== undefined && { stress_level: body.stress_level }),
      ...(body.mood !== undefined && { mood: body.mood }),
      ...(body.notes !== undefined && { notes: body.notes }),
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
          sleep_hours: body.sleep_hours,
          sleep_quality: body.sleep_quality,
          stress_level: body.stress_level
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
