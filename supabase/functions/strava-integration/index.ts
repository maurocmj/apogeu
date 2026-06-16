import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("Strava Integration Service - Booted!");

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verificar Autenticação do Usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Instancia o cliente com o token do usuário para validação e respeito ao RLS
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Instancia o cliente admin para operações de bastidores
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const userId = user.id;
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, ""); // Remove barras finais

    // Chaves secretas do Strava
    const stravaClientId = Deno.env.get("STRAVA_CLIENT_ID");
    const stravaClientSecret = Deno.env.get("STRAVA_CLIENT_SECRET");

    if (!stravaClientId || !stravaClientSecret) {
      return new Response(JSON.stringify({ error: "Strava Client ID or Secret not configured in Supabase environment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ==============================================================
    // ROTA: /exchange (Trocar código OAuth por Tokens)
    // ==============================================================
    if (path.endsWith("/exchange")) {
      const { code } = await req.json();
      if (!code) {
        return new Response(JSON.stringify({ error: "Missing authorization code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      console.log(`Trocando código OAuth do Strava para o usuário ${userId}`);

      // Chamar API do Strava para troca de token
      const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: stravaClientId,
          client_secret: stravaClientSecret,
          code,
          grant_type: "authorization_code"
        })
      });

      if (!tokenResponse.ok) {
        const errText = await tokenResponse.text();
        console.error("Erro na troca de token do Strava:", errText);
        return new Response(JSON.stringify({ error: "Failed token exchange with Strava", details: errText }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const tokenData = await tokenResponse.json();
      const athleteId = tokenData.athlete?.id;
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;
      const expiresAt = new Date(tokenData.expires_at * 1000).toISOString();

      // Upsert na tabela user_strava_tokens
      const { error: upsertError } = await supabaseAdmin
        .from('user_strava_tokens')
        .upsert({
          user_id: userId,
          strava_athlete_id: athleteId,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (upsertError) {
        console.error("Erro ao salvar tokens no banco:", upsertError);
        return new Response(JSON.stringify({ error: "Failed to persist tokens in database" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Sincronizar atividades iniciais (últimos 30 dias) em background
      await syncStravaActivities(supabaseAdmin, userId, accessToken);

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Conectado ao Strava com sucesso!", 
        athlete: tokenData.athlete 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ==============================================================
    // ROTA: /sync (Sincronizar Atividades)
    // ==============================================================
    else if (path.endsWith("/sync")) {
      // 1. Buscar token atual no banco
      const { data: connection, error: dbError } = await supabaseAdmin
        .from('user_strava_tokens')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (dbError || !connection) {
        return new Response(JSON.stringify({ error: "Strava account not connected" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      let accessToken = connection.access_token;
      const expiresAt = new Date(connection.expires_at).getTime();
      const now = Date.now();

      // 2. Renovar token se expirado (com margem de 5 minutos)
      if (expiresAt - now < 300000) {
        console.log(`Renovando token do Strava para o usuário ${userId}`);
        const refreshResponse = await fetch("https://www.strava.com/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: stravaClientId,
            client_secret: stravaClientSecret,
            grant_type: "refresh_token",
            refresh_token: connection.refresh_token
          })
        });

        if (!refreshResponse.ok) {
          const errText = await refreshResponse.text();
          console.error("Erro na renovação do token do Strava:", errText);
          return new Response(JSON.stringify({ error: "Failed token refresh with Strava", details: errText }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const refreshData = await refreshResponse.json();
        accessToken = refreshData.access_token;
        const newExpiresAt = new Date(refreshData.expires_at * 1000).toISOString();
        const newRefreshToken = refreshData.refresh_token || connection.refresh_token;

        // Atualizar banco
        await supabaseAdmin
          .from('user_strava_tokens')
          .update({
            access_token: accessToken,
            refresh_token: newRefreshToken,
            expires_at: newExpiresAt,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      }

      // 3. Executar sincronização
      const syncResult = await syncStravaActivities(supabaseAdmin, userId, accessToken);

      return new Response(JSON.stringify({ 
        success: true, 
        syncedCount: syncResult.syncedCount,
        skippedCount: syncResult.skippedCount
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ==============================================================
    // ROTA: /disconnect (Desconectar Integração)
    // ==============================================================
    else if (path.endsWith("/disconnect")) {
      const { error: deleteError } = await supabaseAdmin
        .from('user_strava_tokens')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error("Erro ao deletar token:", deleteError);
        return new Response(JSON.stringify({ error: "Failed to disconnect Strava integration" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Strava desconectado com sucesso!" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ==============================================================
    // ROTA: /status (Consultar se está conectado)
    // ==============================================================
    else if (path.endsWith("/status")) {
      const { data: connection, error: dbError } = await supabaseAdmin
        .from('user_strava_tokens')
        .select('created_at, updated_at, strava_athlete_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (dbError) {
        console.error("Erro ao buscar status:", dbError);
        return new Response(JSON.stringify({ error: "Failed to check status" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ 
        connected: !!connection,
        connection: connection || null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    else {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

  } catch (error) {
    console.error("Erro geral na Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

// ==============================================================
// Função Auxiliar: Sincronização de Atividades
// ==============================================================
async function syncStravaActivities(supabaseAdmin: any, userId: string, accessToken: string) {
  // Buscar atividades do Strava (últimos 30 dias para simplificar)
  const afterDate = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  
  const activitiesUrl = `https://www.strava.com/api/v3/athlete/activities?after=${afterDate}&per_page=50`;
  const response = await fetch(activitiesUrl, {
    headers: {
      "Authorization": `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Erro ao buscar atividades no Strava:", errText);
    throw new Error(`Failed to fetch activities from Strava: ${errText}`);
  }

  const activities = await response.json();
  let syncedCount = 0;
  let skippedCount = 0;

  for (const activity of activities) {
    // Verificar se a atividade já está no banco de dados
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('health_events')
      .select('id')
      .eq('user_id', userId)
      .eq('event_type', 'WORKOUT_COMPLETED')
      .eq('payload->>id', String(activity.id));

    if (checkError) {
      console.error("Erro ao checar se atividade existe:", checkError);
      continue;
    }

    if (existing && existing.length > 0) {
      skippedCount++;
      continue; // Já sincronizada
    }

    // Criar o evento correspondente na tabela health_events
    // Adaptamos o esporte do Strava para o formato legível
    const sportName = formatSportName(activity.sport_type || activity.type);

    const eventPayload = {
      id: activity.id,
      source: 'strava',
      sport: sportName,
      title: activity.name,
      distance: activity.distance,       // em metros
      moving_time: activity.moving_time,  // em segundos
      elapsed_time: activity.elapsed_time,
      total_elevation_gain: activity.total_elevation_gain,
      start_date: activity.start_date,    // ISO 8601
      average_heartrate: activity.average_heartrate || null,
      max_heartrate: activity.max_heartrate || null,
      suffer_score: activity.suffer_score || 0, // esforço relativo do Strava
      raw: activity // guarda todos os metadados ricos do Strava
    };

    const { error: insertError } = await supabaseAdmin
      .from('health_events')
      .insert({
        user_id: userId,
        event_type: 'WORKOUT_COMPLETED',
        event_date: activity.start_date,
        payload: eventPayload
      });

    if (insertError) {
      console.error(`Erro ao salvar atividade ${activity.id} no banco:`, insertError);
    } else {
      syncedCount++;
    }
  }

  console.log(`Sincronização concluída para o usuário ${userId}. Sincronizados: ${syncedCount}, Ignorados: ${skippedCount}`);
  
  // Opcional: Se sincronizamos novas atividades, podemos invocar o fitness-agent-service em background
  // para que ele gere novos insights imediatamente
  if (syncedCount > 0) {
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/fitness-agent-service`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}` // ou service role se precisar
        },
        body: JSON.stringify({ userId, event: "NEW_ACTIVITIES_SYNCED" })
      });
    } catch (err) {
      console.error("Erro ao chamar fitness-agent-service pós sync:", err);
    }
  }

  return { syncedCount, skippedCount };
}

function formatSportName(stravaType: string): string {
  switch (stravaType) {
    case 'Run':
    case 'TrailRun':
      return 'Running';
    case 'Ride':
    case 'VirtualRide':
    case 'MountainBikeRide':
      return 'Cycling';
    case 'Swim':
      return 'Swimming';
    case 'WeightTraining':
      return 'Weight Training';
    case 'Workout':
      return 'Workout';
    case 'Yoga':
      return 'Yoga';
    case 'Walk':
      return 'Walking';
    default:
      return stravaType;
  }
}
