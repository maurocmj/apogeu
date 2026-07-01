import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Read the Garmin Payload
    const body = await req.json();

    // Garmin Webhooks usually have an array of events by type, for example:
    // { "dailies": [...], "sleeps": [...], "activities": [...] }
    
    // In a real implementation, you must verify the Garmin OAuth signature in the headers
    // For this mockup, we'll extract the data and save it.
    
    // Example for Sleep Data
    if (body.sleeps && Array.isArray(body.sleeps)) {
      for (const sleep of body.sleeps) {
        // Find the user by garmin_user_id
        const userAccessToken = sleep.userAccessToken;
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('garmin_access_token', userAccessToken)
          .maybeSingle();

        if (!userProfile) continue;
        
        const userId = userProfile.id;
        const date = sleep.calendarDate; // YYYY-MM-DD

        // Garmin sends sleep duration in seconds
        const sleep_hours = sleep.durationInSeconds ? parseFloat((sleep.durationInSeconds / 3600).toFixed(1)) : null;
        
        // Garmin might send deep and rem directly
        const deepSleepSeconds = sleep.deepSleepDurationInSeconds || 0;
        const remSleepSeconds = sleep.remSleepInSeconds || 0;
        const totalSleep = sleep.durationInSeconds || 1;
        
        let sleep_quality = 50;
        if (totalSleep > 0) {
           const restorativeRatio = (deepSleepSeconds + remSleepSeconds) / totalSleep;
           sleep_quality = Math.max(50, Math.min(100, Math.round(50 + (restorativeRatio * 100))));
        }

        // Upsert to daily_habits
        const { data: existing } = await supabase
          .from('daily_habits')
          .select('metrics')
          .eq('user_id', userId)
          .eq('date', date)
          .maybeSingle();

        const existingMetrics = existing?.metrics || {};
        const newMetrics = {
          ...existingMetrics,
          ...(sleep_hours !== null && { sleep_hours }),
          sleep_quality,
          sync_source: 'garmin',
          synced_at: new Date().toISOString()
        };

        await supabase
          .from('daily_habits')
          .upsert({
            user_id: userId,
            date: date,
            metrics: newMetrics
          }, { onConflict: 'user_id, date' });

        // Log Event
        await supabase.from('health_events').insert({
          user_id: userId,
          event_type: 'DAILY_METRICS_SYNCED',
          event_date: new Date().toISOString(),
          payload: {
            date,
            source: 'garmin',
            metrics: { sleep_hours, sleep_quality },
            raw_data: sleep
          }
        });
      }
    }

    // You would add similar blocks for `body.dailies` (steps, stress) and `body.activities` (heart rate)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Garmin Sync Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
