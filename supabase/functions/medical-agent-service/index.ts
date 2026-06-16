import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import OpenAI from "https://esm.sh/openai@4.28.0"

console.log("Medical Agent Service - Booted!");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json();
    const examId = payload.examId || payload.record?.id;

    if (!examId) throw new Error("examId missing");

    console.log(`Iniciando Avaliação Clínica para o Exame: ${examId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("VITE_SUPABASE_ANON_KEY");
    const openaiKey = payload.openaiKey || Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !supabaseKey || !openaiKey) throw new Error("Missing ENVs");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    // 1. Fetch Exam Biomarkers
    const { data: exam } = await supabase.from('medical_exams').select('*').eq('id', examId).single();
    if (!exam) throw new Error("Exame não encontrado");

    // 2. Fetch User Profile (Anamnese + Metas)
    const { data: goalData } = await supabase.from('user_goals').select('*').eq('user_id', exam.user_id).eq('is_active', true).single();
    const { data: medHistory } = await supabase.from('medical_history').select('*').eq('user_id', exam.user_id).single();

    // 3. Fetch System Prompt
    const { data: promptData } = await supabase.from('agent_prompts').select('system_prompt').eq('agent_role', 'Medical').single();
    const systemPrompt = promptData?.system_prompt || "Você é um agente médico.";

    const promptContext = `
      --- CONTEXTO DO PACIENTE ---
      Objetivo: ${goalData?.goal_type || 'Geral'} - ${goalData?.description || ''}
      Anamnese: ${JSON.stringify(medHistory?.baseline_data || {})}
      
      --- BIOMARCADORES EXTRAÍDOS ---
      ${JSON.stringify(exam.biomarkers || {})}
      
      Analise os biomarcadores no contexto do objetivo do paciente e gere um JSON estruturado:
      {
        "chat_message": "Uma visão geral clínica do exame, resumindo a saúde do paciente baseada nos biomarcadores. Deve ser um parágrafo claro e direto (SEM incluir o plano de ação aqui).",
        "action_plan": [ "Ação 1", "Ação 2", "Ação 3" ],
        "delegations": [ { "agent_role": "nutritionist", "instructions": "O que a nutricionista deve alterar na dieta com base nestes exames" } ]
      }
    `;

    // 4. OpenAI Call
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: promptContext }
      ],
      response_format: { type: "json_object" }
    });

    const jsonResponse = JSON.parse(completion.choices[0].message.content || "{}");

    // 5. Save Insights
    const { error: updateError } = await supabase
      .from('medical_exams')
      .update({ ai_insights: jsonResponse })
      .eq('id', examId);

    if (updateError) throw updateError;

    // 6. Cross-Agent Delegation
    if (jsonResponse.delegations && Array.isArray(jsonResponse.delegations)) {
      for (const delegation of jsonResponse.delegations) {
        await supabase.from('agent_insights').insert({
          user_id: exam.user_id,
          agent_role: delegation.agent_role,
          context: 'medical_exam_crossover',
          content: delegation.instructions,
          status: 'pending'
        });
      }
    }

    return new Response(
      JSON.stringify({ message: "Insight gerado com sucesso", insights: jsonResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (err) {
    console.error("Erro no Medical Agent:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
})
