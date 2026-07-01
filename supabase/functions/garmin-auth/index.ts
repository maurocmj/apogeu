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
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'init'; // 'init' or 'callback'

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'init') {
      // Step 1: Generate Authorization URL (Mockup for OAuth 2.0 / 1.0a)
      // Garmin requires Consumer Key and Secret
      const clientId = Deno.env.get("GARMIN_CLIENT_ID");
      const redirectUri = Deno.env.get("GARMIN_REDIRECT_URI") || `${url.origin}/functions/v1/garmin-auth?action=callback`;
      
      if (!clientId) {
        throw new Error("GARMIN_CLIENT_ID is not configured.");
      }

      // Generate the Garmin OAuth URL
      const garminAuthUrl = `https://connect.garmin.com/oauthConfirm?oauth_callback=${encodeURIComponent(redirectUri)}`;
      
      return new Response(JSON.stringify({ url: garminAuthUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } 
    else if (action === 'callback') {
      // Step 2: Handle OAuth Callback from Garmin
      // Extract tokens from query params
      const oauth_token = url.searchParams.get('oauth_token');
      const oauth_verifier = url.searchParams.get('oauth_verifier');
      
      // We would normally exchange the request token + verifier for an ACCESS TOKEN here
      // via a POST to Garmin's OAuth endpoints.
      const mockAccessToken = "mock_garmin_access_token_" + Date.now();
      const mockTokenSecret = "mock_garmin_token_secret_" + Date.now();
      
      // In a real flow, you must identify WHICH user initiated the flow (e.g. by passing a state param)
      const userId = url.searchParams.get('state'); 

      if (userId) {
        // Save the tokens to the profiles table
        await supabase
          .from('profiles')
          .update({
            garmin_access_token: mockAccessToken,
            garmin_token_secret: mockTokenSecret
          })
          .eq('id', userId);
      }

      // Redirect back to frontend
      return Response.redirect(`${url.origin}/configuracoes?garmin_connected=true`, 302);
    }

    return new Response("Invalid action", { status: 400, headers: corsHeaders });

  } catch (err) {
    console.error("Garmin Auth Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
