import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xhwpiagznwkoroitoulz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhod3BpYWd6bndrb3JvaXRvdWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MjM4NDAsImV4cCI6MjA5NDI5OTg0MH0.XJ-HZIZY9pS4oxV4Nzr0YyZik3oUr8Wi0GquOOZis4c'
);

async function main() {
  console.log('Checking current templates table columns...');

  // Step 1: Check if attachment_ids already exists by querying a row
  const { data: sample, error: sampleErr } = await supabase
    .from('templates')
    .select('id, attachment_ids')
    .limit(1);

  if (!sampleErr) {
    console.log('✅ attachment_ids column ALREADY EXISTS! No migration needed.');
    console.log('Sample:', sample);
    return;
  }

  console.log('Column does not exist yet. Error:', sampleErr.message);
  console.log('\nAttempting migration via RPC...');

  // Step 2: Try to run migration via exec_sql RPC (if it exists)
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS attachment_ids uuid[] DEFAULT \'{}\'::uuid[];'
  });

  if (error) {
    console.error('RPC failed:', error.message);
    console.log('\n⚠️  The anon key cannot run DDL directly.');
    console.log('You need to run this SQL in the Supabase Dashboard SQL Editor:');
    console.log('\n  ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS attachment_ids uuid[] DEFAULT \'{}\'::uuid[];');
  } else {
    console.log('✅ Migration successful!', data);
  }
}

main().catch(console.error);
