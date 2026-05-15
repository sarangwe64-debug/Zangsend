import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function createBucket() {
  console.log('Attempting to create "attachments" bucket...');
  const { data, error } = await supabase.storage.createBucket('attachments', {
    public: false,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'application/pdf', 'text/csv'],
    fileSizeLimit: 5242880 // 5MB
  });
  
  if (error) {
    console.log(`❌ Failed to create bucket: ${error.message}`);
  } else {
    console.log(`✅ Bucket "attachments" created successfully!`);
  }
}

createBucket();
