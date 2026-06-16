import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import OpenAI from "https://esm.sh/openai@4.28.0"

console.log("Exam Parser Service (Microservice) - Booted!");
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json();
    const examId = payload.record?.id || payload.examId;

    console.log(`Nova Análise Requisitada para o Exame: ${examId}`);

    // 1. Inicializa clientes
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("VITE_SUPABASE_ANON_KEY");
    const openaiKey = payload.openaiKey || Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !supabaseKey || !openaiKey) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    // 2. Busca o Exame
    const { data: exam, error: examError } = await supabase
      .from('medical_exams')
      .select('*')
      .eq('id', examId)
      .single();

    if (examError || !exam) throw new Error("Exame não encontrado");

    // 3. Busca o Prompt do Parser
    const { data: promptData, error: promptError } = await supabase
      .from('agent_prompts')
      .select('system_prompt')
      .eq('agent_role', 'ExamParser')
      .single();

    if (promptError || !promptData) throw new Error("Prompt do Parser não encontrado");

    const systemPrompt = promptData.system_prompt;
    const medicalReport = exam.medical_report || "";

    if (!medicalReport.trim()) {
      return new Response(JSON.stringify({ message: "Laudo vazio. Nada a processar." }), { status: 200 });
    }

    console.log("Enviando texto para a OpenAI...");

    // 4. Chama a OpenAI para extrair JSON
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // rápido e eficiente para parsing de texto
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Laudo Médico:\n${medicalReport}\n\nExtraia os resultados num formato JSON válido. Apenas o JSON.` }
      ],
      response_format: { type: "json_object" }
    });

    const jsonText = completion.choices[0].message.content;
    let parsedData = {};
    try {
      parsedData = JSON.parse(jsonText || "{}");
    } catch (e) {
      console.error("Falha ao parsear JSON:", jsonText);
      parsedData = { biomarkers: {} };
    }

    console.log("Biomarcadores extraídos com sucesso!", parsedData);

    // 5. Atualiza o banco de dados com os biomarcadores e metadados
    const { error: updateError } = await supabase
      .from('medical_exams')
      .update({ 
        biomarkers: parsedData.biomarkers || {}, 
        laboratory_name: parsedData.laboratory_name || null,
        exam_type: parsedData.exam_title || exam.exam_type,
        status: 'processed' 
      })
      .eq('id', examId);

    if (updateError) throw updateError;

    // TODO: Disparar o Medical Agent Service para gerar os insights clínicos cruzando com a Anamnese
    
    return new Response(
      JSON.stringify({ message: "Exame processado e JSONB atualizado no banco.", biomarkers: parsedData.biomarkers }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (err) {
    console.error("Erro no Exam Parser:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
})
