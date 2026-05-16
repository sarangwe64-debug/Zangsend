import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const POLL_MS = 2500;
const MAX_POLL = 14; // ~35s per actor — stay under Supabase ~60s function limit

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function extractEmail(items: unknown): string | null {
  if (!items || typeof items !== 'object') return null;
  let found: string | null = null;

  function scan(obj: unknown) {
    if (found) return;
    if (typeof obj === 'string') {
      const s = obj.trim();
      if (emailRegex.test(s)) found = s;
      else {
        const m = s.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (m) found = m[0];
      }
    } else if (Array.isArray(obj)) {
      for (const item of obj) scan(item);
    } else if (obj !== null && typeof obj === 'object') {
      for (const val of Object.values(obj)) scan(val);
    }
  }

  scan(items);
  return found ? found.toLowerCase() : null;
}

type ActorStep = { id: string; input: (url: string) => Record<string, unknown> };

const QUICK_EMAIL_ACTORS: ActorStep[] = [
  { id: 'anchor~linkedin-to-email', input: (url) => ({ startUrls: [{ url }] }) },
  { id: 'snipercoder~linkedin-email-finder', input: (url) => ({ linkedin: url }) },
  { id: 'vulnv~linkedin-email-finder', input: (url) => ({ urls: [url] }) },
  { id: 'blitzapi~linkedin-email-finder', input: (url) => ({ linkedin_profile_url: url }) },
];

const PROFILE_ACTOR = 'apimaestro~linkedin-profile-detail';

async function startRun(actorId: string, input: Record<string, unknown>, token: string) {
  const res = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const raw = await res.text();
  if (!res.ok) {
    const quota =
      res.status === 402 ||
      res.status === 429 ||
      raw.includes('quota') ||
      raw.includes('limit');
    return { error: quota ? 'quota' as const : raw.slice(0, 120) };
  }
  const d = JSON.parse(raw).data;
  return { runId: d.id as string, datasetId: d.defaultDatasetId as string };
}

async function pollRun(runId: string, token: string) {
  for (let i = 0; i < MAX_POLL; i++) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    const s = await (
      await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json();
    const status = s.data?.status;
    if (status === 'SUCCEEDED') return true;
    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) return false;
  }
  return false;
}

async function fetchDataset(datasetId: string, token: string) {
  const r = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return r.json();
}

function extractProfile(items: unknown[]) {
  const result = {
    first_name: null as string | null,
    last_name: null as string | null,
    company_name: null as string | null,
    title: null as string | null,
  };
  if (!items?.length) return result;
  const p = items[0] as Record<string, unknown>;
  result.first_name = (p.first_name || p.firstName || null) as string | null;
  result.last_name = (p.last_name || p.lastName || null) as string | null;
  result.company_name = (p.company || p.companyName || null) as string | null;
  result.title = (p.headline || p.title || null) as string | null;
  if (!result.first_name && typeof p.name === 'string') {
    const parts = p.name.split(' ');
    result.first_name = parts[0] || null;
    result.last_name = parts.slice(1).join(' ') || null;
  }
  const exps = p.experiences as { company?: string; title?: string }[] | undefined;
  if (!result.company_name && exps?.length) {
    result.company_name = exps[0].company || null;
    result.title = exps[0].title || result.title;
  }
  return result;
}

async function runActor(
  actorId: string,
  input: Record<string, unknown>,
  tokens: string[],
  startTokenIndex = 0
) {
  let tokenIndex = startTokenIndex;
  const getToken = () => tokens[tokenIndex % tokens.length];
  const rotate = () => {
    tokenIndex = (tokenIndex + 1) % tokens.length;
  };

  let started = await startRun(actorId, input, getToken());
  if (started.error === 'quota' && tokens.length > 1) {
    rotate();
    started = await startRun(actorId, input, getToken());
  }
  if (started.error || !started.runId || !started.datasetId) {
    return { items: null, tokenIndex };
  }

  const ok = await pollRun(started.runId, getToken());
  if (!ok) return { items: null, tokenIndex };

  const items = await fetchDataset(started.datasetId, getToken());
  return { items: Array.isArray(items) ? items : [], tokenIndex };
}

async function findEmailWaterfall(url: string, tokens: string[]) {
  let tokenIndex = 0;
  let profile = extractProfile([]);

  for (const actor of QUICK_EMAIL_ACTORS) {
    const { items, tokenIndex: next } = await runActor(
      actor.id,
      actor.input(url),
      tokens,
      tokenIndex
    );
    tokenIndex = next;
    if (!items) continue;

    const p = extractProfile(items);
    if (p.first_name) profile = { ...profile, ...p };

    const email = extractEmail(items);
    if (email) return { email, profile };
  }

  return { email: null, profile };
}

async function fetchProfile(url: string, tokens: string[]) {
  const { items } = await runActor(PROFILE_ACTOR, { urls: [url] }, tokens, 0);
  if (!items?.length) return extractProfile([]);
  return extractProfile(items);
}

async function resolveTokens(req: Request, clientTokens?: string[]): Promise<string[]> {
  const fromEnv = [Deno.env.get('APIFY_TOKEN'), Deno.env.get('APIFY_TOKEN2')].filter(
    (t): t is string => Boolean(t)
  );
  const fromClient = (clientTokens || []).filter(Boolean);
  const dbTokens: string[] = [];

  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (supabaseUrl && serviceKey) {
      const admin = createClient(supabaseUrl, serviceKey);
      const jwt = authHeader.replace('Bearer ', '');
      const { data: { user } } = await admin.auth.getUser(jwt);
      if (user) {
        const { data: keys } = await admin
          .from('apify_keys')
          .select('api_key_encrypted, label')
          .eq('user_id', user.id)
          .eq('is_active', true);
        if (keys?.length) {
          const order = ['primary', 'fallback'];
          const sorted = [...keys].sort(
            (a, b) => order.indexOf(a.label) - order.indexOf(b.label)
          );
          dbTokens.push(...sorted.map((k) => k.api_key_encrypted).filter(Boolean));
        }
      }
    }
  }

  return [...new Set([...fromClient, ...dbTokens, ...fromEnv])];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { url, tokens: clientTokens, mode = 'email_only' } = body;
    if (!url) throw new Error('LinkedIn URL is required');

    const tokens = await resolveTokens(req, clientTokens);
    if (tokens.length === 0) {
      throw new Error(
        'No Apify API key configured. Open Settings → Apify Keys, paste your key, and click Save Keys.'
      );
    }

    let profile = extractProfile([]);
    let email: string | null = null;

    if (mode === 'full') {
      // One scraper that often returns profile + email (keeps Autofill under ~60s limit)
      const { items } = await runActor(
        'dev_fusion~linkedin-profile-scraper',
        { profileUrls: [url] },
        tokens,
        0
      );
      if (items?.length) {
        profile = extractProfile(items);
        email = extractEmail(items);
      }
      if (!profile.first_name) {
        profile = await fetchProfile(url, tokens);
      }
    }

    if (!email) {
      const emailResult = await findEmailWaterfall(url, tokens);
      email = emailResult.email;
      profile = {
        first_name: profile.first_name || emailResult.profile.first_name,
        last_name: profile.last_name || emailResult.profile.last_name,
        company_name: profile.company_name || emailResult.profile.company_name,
        title: profile.title || emailResult.profile.title,
      };
    }

    const result = {
      first_name: profile.first_name,
      last_name: profile.last_name,
      company_name: profile.company_name,
      title: profile.title,
      email,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
