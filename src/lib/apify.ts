import { supabase } from './supabase';

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

/** Call find-email with readable errors (Autofill + Find Emails). */
export async function invokeFindEmail(body: {
  url: string;
  mode?: 'email_only' | 'full';
  tokens?: string[];
}) {
  const tokens = body.tokens?.length ? body.tokens : await resolveApifyTokens();
  if (tokens.length === 0) {
    throw new Error('Add your Apify API key in Settings → Apify Keys, then click Save Keys.');
  }

  const { data, error } = await supabase.functions.invoke('find-email', {
    body: { ...body, tokens },
  });

  if (error) {
    let message = error.message;
    const ctx = (error as { context?: Response }).context;
    if (ctx) {
      try {
        const parsed = await ctx.json();
        if (parsed?.error) message = String(parsed.error);
      } catch {
        /* use default message */
      }
    }
    throw new Error(message);
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error));
  }

  return data as {
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
    title?: string | null;
  };
}
