import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Carrega as variáveis do .env.local
const envPath = path.resolve('.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1]] = match[2].trim();
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const supabaseKey = envVars['VITE_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  const userId = "290cfce4-2974-4d3a-8f7d-43e75a4e9fd8";

  console.log("User ID:", userId);

  console.log("2. Inserindo no banco de dados...");
  const { data: newExam, error: dbError } = await supabase
    .from('medical_exams')
    .insert({
      user_id: userId,
      exam_type: 'Teste de CLI',
      medical_report: 'Teste de Vitamina D: 25 ng/mL. Glicemia: 90.',
      collection_date: new Date().toISOString(),
      status: 'processing'
    })
    .select()
    .single();

  if (dbError) {
    console.error("ERRO NO BANCO:", dbError);
    return;
  }
  
  console.log("Exame inserido com sucesso! ID:", newExam.id);

  console.log("3. Chamando exam-parser-service...");
  const { data: parseData, error: parseError } = await supabase.functions.invoke('exam-parser-service', {
    body: { examId: newExam.id }
  });
  
  if (parseError) {
    console.error("ERRO NO PARSER:", parseError);
    // return;
  } else {
    console.log("Parser retornou:", parseData);
  }

  console.log("4. Chamando medical-agent-service...");
  const { data: agentData, error: agentError } = await supabase.functions.invoke('medical-agent-service', {
    body: { examId: newExam.id }
  });

  if (agentError) {
    console.error("ERRO NO AGENTE:", agentError);
  } else {
    console.log("Agente retornou:", agentData);
  }
  
  console.log("TESTE FINALIZADO!");
}

runTest();
