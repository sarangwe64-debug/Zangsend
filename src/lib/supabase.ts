import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Set them in .env (local) or Netlify environment variables (production).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: { 'x-my-custom-header': 'zangsend' },
  },
});

const originalInvoke = supabase.functions.invoke.bind(supabase.functions);

/** In dev, call local Supabase CLI (`supabase start`) when available. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(supabase.functions as any).invoke = async (functionName: string, options?: Parameters<typeof originalInvoke>[1]) => {
  if (import.meta.env.DEV) {
    const localUrl = `http://127.0.0.1:54321/functions/v1/${functionName}`;
    const res = await fetch(localUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(options?.body || {}),
    });
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok) {
      const errMsg =
        data && typeof data === 'object' && 'error' in data
          ? String((data as { error: string }).error)
          : 'Function call failed';
      return { data: null, error: new Error(errMsg) };
    }
    return { data, error: null };
  }
  return originalInvoke(functionName, options);
};
