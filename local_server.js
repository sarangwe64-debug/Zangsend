import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';

const app = express();
app.use(cors({ origin: '*' })); // Wide open for local dev
app.use(express.json({ limit: '50mb' }));

// Log every request
app.use((req, res, next) => {
  if (req.path === '/functions/v1/find-email') {
    console.log(`\nIncoming Request: ${req.method} ${req.path} for URL: ${req.body?.url}`);
  }
  next();
});

// ── Dual Apify token rotation ──────────────────────────────────────────────
let APIFY_TOKENS = [process.env.APIFY_TOKEN, process.env.APIFY_TOKEN2].filter(Boolean);
if (APIFY_TOKENS.length === 0) {
  console.warn('[ZangSends] Set APIFY_TOKEN in .env for local email finding.');
}
let currentTokenIndex = 0;
const getToken = () => {
  if (APIFY_TOKENS.length === 0) throw new Error('APIFY_TOKEN not set in .env');
  return APIFY_TOKENS[currentTokenIndex];
};
const rotateToken = () => {
  currentTokenIndex = (currentTokenIndex + 1) % APIFY_TOKENS.length;
  console.log(`[Token] Rotated to index ${currentTokenIndex}`);
};

// ── 16 VERIFIED actors — all live-tested 2026-05-14 ──────────────────────
// Some actors use strict schema validation, while others are "lenient" and fall back 
// to their default web inputs (like Bill Gates) if the exact field is missed.
// For lenient actors, we pass a "catch-all" payload with every common URL field.

const catchAll = (url) => ({
  urls: [url],
  profileUrls: [url],
  linkedinUrls: [url],
  startUrls: [{ url }],
  linkedin: url,
  linkedin_profile_url: url,
  url: url,
  // Add common activation flags found in various actors
  includeEmail: true,
  extractEmail: true,
  findEmail: true,
  scrapeEmail: true,
});

const ACTOR_WATERFALL = [
  // ── Primary Email Finders ──────────────────────────────────────────
  { id: 'snipercoder~linkedin-email-finder', input: (url) => ({ linkedin: url }) },
  { id: 'vulnv~linkedin-email-finder', input: (url) => ({ urls: [url] }) },
  { id: 'snipercoder~bulk-linkedin-email-finder', input: (url) => ({ linkedin: [url] }) },
  { id: 'anchor~linkedin-to-email', input: (url) => ({ startUrls: [{ url }] }) },
  { id: 'blitzapi~linkedin-email-finder', input: (url) => ({ linkedin_profile_url: url }) },
  { id: 'iron-crawler~linkedin-email-finder', input: catchAll },
  { id: 'api-empire~linkedin-profile-email-scraper', input: catchAll },
  { id: 'parvenu~email-enrichment', input: catchAll },
  { id: 'snipercoder~bulk-decision-makers-email-finder', input: catchAll },
  { id: 'snipercoder~decision-maker-email-finder', input: catchAll },

  // ── B2B & Keyword Based Scrapers ────────────────────────────────────
  { id: 'scraper-mind~linkedin-b2b-email-scraper', input: catchAll },
  { id: 'scraper-mind~linkedin-profiles-email-scraper', input: catchAll },
  { id: 'contacts-api~linkedin-profiles-email-scraper', input: catchAll },
  { id: 'unlimitedleadtestinbox~linkedin-email-scraper', input: catchAll },
  { id: 'x_guru~linkedin-email-Scraper-no-cookies', input: catchAll },
  { id: 'b2b_leads~linkedin-profile-scraper', input: catchAll },
  { id: 'tomba-io~linkedin-finder', input: catchAll },
  { id: 'khadinakbar~linkedin-profile-email-scraper', input: catchAll },
  { id: 'bhansalisoft~linkedin-email-scraper', input: catchAll },

  // ── High-Volume Profile Enrichment ──────────────────────────────────
  { id: 'dev_fusion~linkedin-profile-scraper', input: (url) => ({ profileUrls: [url] }) },
  { id: 'harvestapi~linkedin-profile-scraper', input: catchAll },
  { id: 'apify~mass-linkedin-profile-scraper', input: catchAll },
  { id: 'apimaestro~linkedin-profile-detail', input: catchAll },
  { id: 'apimaestro~linkedin-profile-batch-scraper-no-cookies-required', input: catchAll },
  { id: 'anchor~linkedin-profile-enrichment', input: catchAll },
];

// ── Health & key-update endpoints ─────────────────────────────────────────
app.get('/health', (_, res) => res.json({
  ok: true,
  token: getToken().slice(0, 20) + '...',
  actors: ACTOR_WATERFALL.length,
  time: new Date().toISOString(),
}));

app.post('/update-apify-keys', (req, res) => {
  const { primary, fallback } = req.body;
  if (primary) APIFY_TOKENS[0] = primary;
  if (fallback) APIFY_TOKENS[1] = fallback;
  currentTokenIndex = 0;
  console.log('[Keys] Updated via Settings UI');
  res.json({ ok: true });
});

// ── Core actor runner ─────────────────────────────────────────────────────
async function startRun(actorId, input) {
  const token = getToken();
  console.log(`  → Starting ${actorId}`);

  const startRes = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const raw = await startRes.text();
  if (!startRes.ok) {
    // Quota/rate hit → rotate token and signal caller to retry
    if (startRes.status === 402 || startRes.status === 429 || raw.includes('quota') || raw.includes('limit')) {
      rotateToken();
      return { error: 'quota' };
    }
    // Actor not found / bad input → skip silently
    return { error: raw.slice(0, 120) };
  }

  const d = JSON.parse(raw).data;
  return { runId: d.id, datasetId: d.defaultDatasetId };
}

async function pollRun(runId, token) {
  for (let i = 0; i < 60; i++) {          // up to 5 min
    await new Promise(r => setTimeout(r, 5000));
    const s = await (await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })).json();
    const status = s.data?.status;
    console.log(`    [${(i + 1) * 5}s] ${runId} → ${status}`);
    if (status === 'SUCCEEDED') return true;
    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) return false;
  }
  return false;
}

async function fetchDataset(datasetId, token) {
  const r = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return r.json();
}

function extractEmail(items) {
  if (!items || typeof items !== 'object') return null;

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  let foundEmail = null;

  function scan(obj) {
    if (foundEmail) return;
    if (typeof obj === 'string') {
      const s = obj.trim();
      if (emailRegex.test(s)) foundEmail = s;
      // Some scrapers return "Email: xxx@yyy.com" or a string with multiple words
      else {
         const match = s.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
         if (match) foundEmail = match[0];
      }
    } else if (Array.isArray(obj)) {
      for (const item of obj) scan(item);
    } else if (obj !== null && typeof obj === 'object') {
      for (const val of Object.values(obj)) scan(val);
    }
  }

  scan(items);
  return foundEmail ? foundEmail.toLowerCase() : null;
}

// ── Main find-email endpoint ───────────────────────────────────────────────
app.post('/functions/v1/find-email', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'LinkedIn URL required' });

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`[FindEmail] ${url}`);
  console.log(`${'═'.repeat(60)}`);

  let email = null;
  let triedActors = 0;

  for (const actor of ACTOR_WATERFALL) {
    if (email) break;
    triedActors++;
    console.log(`\n[Actor ${triedActors}/${ACTOR_WATERFALL.length}] ${actor.id}`);

    try {
      const input = actor.input(url);
      const { runId, datasetId, error } = await startRun(actor.id, input);

      if (error === 'quota') {
        // Already rotated — retry same actor with new token
        const { runId: r2, datasetId: d2, error: e2 } = await startRun(actor.id, input);
        if (e2) { console.log(`    Skipped (${e2.slice(0, 80)})`); continue; }
        const ok2 = await pollRun(r2, getToken());
        if (ok2) email = extractEmail(await fetchDataset(d2, getToken()));
      } else if (error) {
        console.log(`    Skipped (${error.slice(0, 80)})`);
        continue;
      } else {
        const ok = await pollRun(runId, getToken());
        if (ok) email = extractEmail(await fetchDataset(datasetId, getToken()));
      }

      if (email) console.log(`    ✅ Found: ${email}`);
      else console.log(`    ✗ No email returned`);

    } catch (err) {
      console.log(`    Error: ${err.message}`);
    }
  }

  console.log(`\n[Result] ${email || 'NOT FOUND'} (tried ${triedActors} actors)`);
  res.json({ email });
});

// ── Send Email Endpoint ───────────────────────────────────────────────────
app.post('/functions/v1/send-email', async (req, res) => {
  const { to, subject, html, from_email, app_password, sender_name = "Krishn Veer", attachment } = req.body;

  if (!to || !subject || !html || !from_email || !app_password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  console.log(`\n[SendEmail] To: ${to}, From: ${sender_name} <${from_email}>${attachment ? ' (with attachment)' : ''}`);

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: from_email,
        pass: app_password
      }
    });

    const mailOptions = {
      from: `"${sender_name}" <${from_email}>`,
      to,
      subject,
      html
    };

    if (attachment) {
      mailOptions.attachments = [attachment];
    }

    const info = await transporter.sendMail(mailOptions);

    console.log(`    ✅ Sent: ${info.messageId}`);
    res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error(`    ❌ Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = 54321;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ ZangSends proxy  http://127.0.0.1:${PORT}`);
  console.log(`   Waterfall: ${ACTOR_WATERFALL.length} actors`);
  console.log(`   Token:     ${getToken().slice(0, 20)}...`);
});
