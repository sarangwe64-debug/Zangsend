// Batch verify NEW real actors from Apify store API
const TOKEN = 'apify_api_DgnvKfO37PtqUZGcZKn6bNzvhKdbXq4jViUV';
const TEST_URL = 'https://www.linkedin.com/in/williamhgates/';

// All extracted from real Apify Store API response (username~name format)
const CANDIDATES = [
  // Email-focused actors (from search results)
  { id: 'apimaestro~linkedin-profile-batch-scraper-no-cookies-required', input: { urls: [TEST_URL] } },
  { id: 'apimaestro~linkedin-profile-full-sections-scraper',             input: { urls: [TEST_URL] } },
  { id: 'easyapi~linkedin-email-scraper',                                input: { urls: [TEST_URL] } },
  { id: 'x_guru~linkedin-email-Scraper-no-cookies',                     input: { urls: [TEST_URL] } },
  { id: 'purple_beep_boop~find-b2b-emails-for-outreach',                input: { urls: [TEST_URL] } },
  { id: 'snipercoder~bulk-linkedin-email-finder',                        input: { linkedin: TEST_URL } },
  { id: 'slothtechlabs~linkedin-email-finder-profile-scraper-no-login', input: { urls: [TEST_URL] } },

  // Profile scrapers with email (from search results)
  { id: 'harvestapi~linkedin-profile-scraper',        input: { profileUrls: [TEST_URL] } },
  { id: 'anchor~linkedin-profile-enrichment',         input: { startUrls: [{ url: TEST_URL }] } },
  { id: 'datadoping~linkedin-profile-scraper',        input: { profileUrls: [TEST_URL] } },
  { id: 'crawlerbros~linkedin-profile-scraper',       input: { profileUrls: [TEST_URL] } },
  { id: 'vulnv~linkedin-profile-scraper',             input: { urls: [TEST_URL] } },

  // Variant inputs to try for known actors
  { id: 'x_guru~linkedin-email-scraper-no-cookies',   input: { linkedinUrls: [TEST_URL] } },
  { id: 'x_guru~linkedin-email-scraper-no-cookies',   input: { profileUrls: [TEST_URL] } },
  { id: 'x_guru~linkedin-email-scraper-no-cookies',   input: { startUrls: [{ url: TEST_URL }] } },
  { id: 'slothtechlabs~linkedin-email-finder-profile-scraper-no-login', input: { profileUrls: [TEST_URL] } },
  { id: 'slothtechlabs~linkedin-email-finder-profile-scraper-no-login', input: { startUrls: [{ url: TEST_URL }] } },
  { id: 'slothtechlabs~linkedin-email-finder-profile-scraper-no-login', input: { linkedinUrls: [TEST_URL] } },
  { id: 'purple_beep_boop~find-b2b-emails-for-outreach', input: { linkedinUrls: [TEST_URL] } },
  { id: 'purple_beep_boop~find-b2b-emails-for-outreach', input: { profileUrls: [TEST_URL] } },
  { id: 'purple_beep_boop~find-b2b-emails-for-outreach', input: { startUrls: [{ url: TEST_URL }] } },
  { id: 'easyapi~linkedin-email-scraper',             input: { profileUrls: [TEST_URL] } },
  { id: 'easyapi~linkedin-email-scraper',             input: { startUrls: [{ url: TEST_URL }] } },
  { id: 'harvestapi~linkedin-profile-scraper',        input: { startUrls: [{ url: TEST_URL }] } },
  { id: 'harvestapi~linkedin-profile-scraper',        input: { urls: [TEST_URL] } },
  { id: 'datadoping~linkedin-profile-scraper',        input: { startUrls: [{ url: TEST_URL }] } },
  { id: 'datadoping~linkedin-profile-scraper',        input: { urls: [TEST_URL] } },
  { id: 'anchor~linkedin-profile-enrichment',         input: { profileUrls: [TEST_URL] } },
  { id: 'anchor~linkedin-profile-enrichment',         input: { urls: [TEST_URL] } },
  { id: 'vulnv~linkedin-profile-scraper',             input: { startUrls: [{ url: TEST_URL }] } },
  { id: 'vulnv~linkedin-profile-scraper',             input: { profileUrls: [TEST_URL] } },
];

async function test(id, inputName, input) {
  const res = await fetch(`https://api.apify.com/v2/acts/${id}/runs`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const text = await res.text();
  if (res.status === 201) {
    const runId = JSON.parse(text).data?.id;
    if (runId) await fetch(`https://api.apify.com/v2/actor-runs/${runId}/abort`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${TOKEN}` },
    });
    return `✅ ${res.status}`;
  }
  let msg = '';
  try { msg = JSON.parse(text)?.error?.message?.slice(0, 60) || ''; } catch {}
  return `❌ ${res.status} ${msg}`;
}

async function main() {
  console.log(`Testing ${CANDIDATES.length} candidates...\n`);
  const working = [];
  const seen = new Set();

  for (const c of CANDIDATES) {
    const inputName = Object.keys(c.input)[0];
    process.stdout.write(`${c.id.padEnd(60)} [${inputName.padEnd(14)}] → `);
    const result = await test(c.id, inputName, c.input);
    console.log(result);
    if (result.startsWith('✅') && !seen.has(c.id)) {
      working.push({ id: c.id, input: c.input });
      seen.add(c.id);
    }
    await new Promise(r => setTimeout(r, 250));
  }

  console.log(`\n${'─'.repeat(70)}`);
  console.log(`✅ NEW WORKING ACTORS (${working.length}):`);
  for (const w of working) {
    const key = Object.keys(w.input)[0];
    const val = JSON.stringify(w.input[key]);
    console.log(`  { id: '${w.id}', input: (url) => ({ ${key}: ${val.replace('"https://www.linkedin.com/in/williamhgates/"', 'url')} }) }`);
  }
}

main().catch(console.error);
