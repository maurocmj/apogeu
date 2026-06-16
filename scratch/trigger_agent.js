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
const openaiKey = envVars['VITE_OPENAI_API_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

const examId = '4c6a7e7d-9967-408a-be2b-1cda26ff7bf4'; // ID do exame processado

async function run() {
  console.log("Acionando Medical Agent Service para o exame:", examId);
  const { data: agentData, error: agentError } = await supabase.functions.invoke('medical-agent-service', {
    body: { examId: examId, openaiKey: openaiKey }
  });

  if (agentError) {
    console.error("ERRO NO AGENTE:", agentError);
  } else {
    console.log("Agente retornou:", agentData);
  }
}

run();
