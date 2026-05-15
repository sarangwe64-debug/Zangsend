import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    // When running locally, point Edge Functions to the local Supabase CLI server
    headers: { 'x-my-custom-header': 'zangsend' },
  }
});

// Intercept functions.invoke to point to local CLI in development
const originalInvoke = supabase.functions.invoke.bind(supabase.functions);
supabase.functions.invoke = async (functionName, options) => {
  if (import.meta.env.DEV) {
    const localUrl = `http://127.0.0.1:54321/functions/v1/${functionName}`;
    const res = await fetch(localUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify(options?.body || {})
    });
    let data;
    try { data = await res.json(); } catch(e) {}
    if (!res.ok) return { data: null, error: new Error(data?.error || 'Failed') };
    return { data, error: null };
  }
  return originalInvoke(functionName, options);
};
