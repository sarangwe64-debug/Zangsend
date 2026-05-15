import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkColumns() {
  console.log('Checking specific columns...');
  
  // Check attachment_ids in templates
  const { data: tData, error: tError } = await supabase.from('templates').select('attachment_ids').limit(1);
  if (tError) {
    console.log(`❌ Column "attachment_ids" in "templates" DOES NOT EXIST or error: ${tError.message}`);
  } else {
    console.log(`✅ Column "attachment_ids" in "templates" EXISTS`);
  }

  // Check storage bucket
  const { data: bData, error: bError } = await supabase.storage.listBuckets();
  if (bError) {
    console.log(`❌ Error listing buckets: ${bError.message}`);
  } else {
    const hasAttachments = bData.some(b => b.id === 'attachments');
    console.log(hasAttachments ? `✅ Bucket "attachments" EXISTS` : `❌ Bucket "attachments" DOES NOT EXIST`);
  }
}

checkColumns();
