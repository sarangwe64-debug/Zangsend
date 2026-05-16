/** Apify tokens from Settings (localStorage). Passed to find-email when Supabase secrets are unset. */
export function getApifyTokens(): string[] {
  const primary = localStorage.getItem('apify_primary')?.trim();
  const fallback = localStorage.getItem('apify_fallback')?.trim();
  return [primary, fallback].filter((t): t is string => Boolean(t));
}

export function hasApifyTokens(): boolean {
  return getApifyTokens().length > 0;
}
