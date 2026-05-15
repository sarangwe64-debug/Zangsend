import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xhwpiagznwkoroitoulz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhod3BpYWd6bndrb3JvaXRvdWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MjM4NDAsImV4cCI6MjA5NDI5OTg0MH0.XJ-HZIZY9pS4oxV4Nzr0YyZik3oUr8Wi0GquOOZis4c';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('contacts').insert([
    {
      list_id: '00000000-0000-0000-0000-000000000000',
      user_id: '00000000-0000-0000-0000-000000000000',
      data: {
        first_name: 'Test',
        last_name: 'Test',
        company_name: 'Test',
        title: 'Test',
        linkedin_url: 'https://linkedin.com/in/test'
      },
      email: 'test@example.com',
      status: 'pending'
    }
  ]);
  
  console.log('Error:', error);
}

test();
