import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testRpc() {
  console.log('Testing exec_sql RPC...');
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: 'select 1;'
  });
  
  if (error) {
    console.log(`❌ exec_sql RPC failed: ${error.message}`);
  } else {
    console.log(`✅ exec_sql RPC EXISTS and works! Result:`, data);
  }
}

testRpc();
