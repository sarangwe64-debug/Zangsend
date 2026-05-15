import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkTables() {
  const tables = [
    'profiles', 'lists', 'templates', 'campaigns', 'contacts', 
    'apify_keys', 'telegram_config', 'attachments', 'senders'
  ];
  
  console.log('Checking tables in Supabase...');
  
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        console.log(`❌ Table "${table}" DOES NOT EXIST`);
      } else if (error.code === '42P01') {
         console.log(`❌ Table "${table}" DOES NOT EXIST (42P01)`);
      } else {
        console.log(`❓ Table "${table}": Error ${error.code} - ${error.message}`);
      }
    } else {
      console.log(`✅ Table "${table}" EXISTS`);
    }
  }
}

checkTables();
