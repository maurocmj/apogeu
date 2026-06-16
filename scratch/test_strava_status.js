// Scratch Script: Test Strava Integration Status
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

async function run() {
  console.log("Checking user_strava_tokens table connection...");
  const { data, error } = await supabase
    .from('user_strava_tokens')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error connecting to table:", error.message);
  } else {
    console.log("Table accessible. Row count / sample data:", data);
  }
}

run();
