import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import OpenAI from "https://esm.sh/openai@4.28.0"

console.log("Biomarker Info Service - Booted!");

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
    const biomarkerKey = payload.biomarkerKey;

    if (!biomarkerKey) throw new Error("biomarkerKey missing");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("VITE_SUPABASE_ANON_KEY");
    const openaiKey = payload.openaiKey || Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !supabaseKey || !openaiKey) throw new Error("Missing ENVs");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    // Verifica se já existe
    const { data: existing } = await supabase
      .from('biomarkers_dictionary')
      .select('description')
      .eq('key', biomarkerKey)
      .single();

    if (existing && existing.description) {
      return new Response(JSON.stringify({ description: existing.description, cached: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Se não existir, gera a explicação
    const promptName = biomarkerKey.replace(/_/g, ' ');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Você é um dicionário médico para pacientes. Explique o significado clínico deste indicador ou achado de exame (sangue, imagem, biópsia, etc) de forma simples, direta e em no máximo 2 frases." },
        { role: "user", content: `Explique o significado clínico do resultado: ${promptName}` }
      ],
      temperature: 0.3
    });

    const description = completion.choices[0].message.content;

    // Salva no cache
    await supabase.from('biomarkers_dictionary').insert({
      key: biomarkerKey,
      description: description
    });

    return new Response(
      JSON.stringify({ description: description, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Erro no Biomarker Info:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
})
