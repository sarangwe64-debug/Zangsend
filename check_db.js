import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('settings').select('*').limit(1);
  console.log('Settings table exists?', !!data, error?.message || '');
  
  const { data: d2, error: e2 } = await supabase.from('senders').select('*').limit(1);
  console.log('Senders table exists?', !!d2, e2?.message || '');
}

check();
