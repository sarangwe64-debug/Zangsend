import { supabase } from './supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/** Apify tokens from Settings localStorage. */
export function getApifyTokensFromStorage(): string[] {
  const primary = localStorage.getItem('apify_primary')?.trim();
  const fallback = localStorage.getItem('apify_fallback')?.trim();
  return [primary, fallback].filter((t): t is string => Boolean(t));
}

/** Load keys from localStorage, then Supabase apify_keys if logged in. */
export async function resolveApifyTokens(): Promise<string[]> {
  const local = getApifyTokensFromStorage();
  if (local.length > 0) return local;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('apify_keys')
      .select('label, api_key_encrypted')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error || !data?.length) return [];

    const order = ['primary', 'fallback'];
    return [...data]
      .sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label))
      .map((k) => k.api_key_encrypted)
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function hasApifyTokens(): Promise<boolean> {
  const tokens = await resolveApifyTokens();
  return tokens.length > 0;
}

/** Direct invoke — reliable headers for Supabase Edge Functions from the browser. */
export async function invokeFindEmail(body: {
  url: string;
  mode?: 'email_only' | 'full';
  tokens?: string[];
}) {
  const tokens = body.tokens?.length ? body.tokens : await resolveApifyTokens();
  if (tokens.length === 0) {
    throw new Error('Add your Apify API key in Settings → Apify Keys, then click Save Keys.');
  }

  const { data: { session } } = await supabase.auth.getSession();
  const authToken = session?.access_token ?? supabaseAnonKey;

  const res = await fetch(`${supabaseUrl}/functions/v1/find-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({ ...body, tokens }),
  });

  let data: Record<string, unknown> | null = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg =
      data && typeof data.error === 'string'
        ? data.error
        : `find-email failed (${res.status}). Redeploy the function or check Supabase → Edge Functions.`;
    throw new Error(msg);
  }

  if (data && typeof data.error === 'string') {
    throw new Error(data.error);
  }

  return data as {
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
    title?: string | null;
  };
}
