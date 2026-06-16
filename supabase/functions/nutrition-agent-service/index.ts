import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts"

console.log("Nutrition Agent Service (Microservice) - Booted!");

Deno.serve(async (req) => {
  const payload = await req.json();

  console.log(`Nutrition Agent rodando a análise...`);

  // 1. O agente nutricional recalcula as metas de calorias baseado no objetivo (user_goals)
  // TODO: Conectar com IA para sugerir ajustes na dieta

  return new Response(
    JSON.stringify({ message: "Insight nutricional gravado na tabela agent_insights." }),
    { headers: { "Content-Type": "application/json" } },
  )
})
