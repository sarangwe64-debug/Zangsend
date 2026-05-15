const TOKEN = 'apify_api_ibKagGGKFMueztXM2HxupPOlsDIoVc0Z8hkK';
const URL = 'https://www.linkedin.com/in/akash-biswas-695a4599/';

const catchAll = (url) => ({
  urls: [url],
  profileUrls: [url],
  linkedinUrls: [url],
  startUrls: [{ url }],
  linkedin: url,
  linkedin_profile_url: url,
  url: url,
  includeEmail: true,
  extractEmail: true,
  findEmail: true,
  scrapeEmail: true,
});

const ACTOR_WATERFALL = [
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
  { id: 'scraper-mind~linkedin-b2b-email-scraper', input: catchAll },
  { id: 'scraper-mind~linkedin-profiles-email-scraper', input: catchAll },
  { id: 'contacts-api~linkedin-profiles-email-scraper', input: catchAll },
  { id: 'unlimitedleadtestinbox~linkedin-email-scraper', input: catchAll },
  { id: 'x_guru~linkedin-email-Scraper-no-cookies', input: catchAll },
  { id: 'b2b_leads~linkedin-profile-scraper', input: catchAll },
  { id: 'tomba-io~linkedin-finder', input: catchAll },
  { id: 'khadinakbar~linkedin-profile-email-scraper', input: catchAll },
  { id: 'bhansalisoft~linkedin-email-scraper', input: catchAll },
  { id: 'dev_fusion~linkedin-profile-scraper', input: (url) => ({ profileUrls: [url] }) },
  { id: 'harvestapi~linkedin-profile-scraper', input: catchAll },
  { id: 'apify~mass-linkedin-profile-scraper', input: catchAll },
  { id: 'apimaestro~linkedin-profile-detail', input: catchAll },
  { id: 'apimaestro~linkedin-profile-batch-scraper-no-cookies-required', input: catchAll },
  { id: 'anchor~linkedin-profile-enrichment', input: catchAll },
];

async function pollRun(runId, token) {
  for (let i = 0; i < 40; i++) { // Max 2 mins
    await new Promise(r => setTimeout(r, 3000));
    const s = await (await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })).json();
    const status = s.data?.status;
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

async function main() {
  for (const actor of ACTOR_WATERFALL) {
    console.log(`\n===========================================`);
    console.log(`TESTING: ${actor.id}`);
    const input = actor.input(URL);
    
    const res = await fetch(`https://api.apify.com/v2/acts/${actor.id}/runs`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    
    const text = await res.text();
    if (res.status !== 201) {
      console.log(`ERROR STARTING: ${text.slice(0, 100)}`);
      continue;
    }
    
    const d = JSON.parse(text).data;
    console.log(`Run started: ${d.id}`);
    
    const ok = await pollRun(d.id, TOKEN);
    if (!ok) {
      console.log(`FAILED TO COMPLETE.`);
      continue;
    }
    
    const items = await fetchDataset(d.defaultDatasetId, TOKEN);
    if (items.length > 0) {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const flat = JSON.stringify(items[0]);
      const match = flat.match(emailRegex);
      if (match) {
         console.log(`✅ FOUND EMAIL: ${match[0]}`);
      } else {
         console.log("❌ NO EMAIL FOUND in JSON output.");
      }
      console.log(`Keys: ${Object.keys(items[0]).join(', ')}`);
    } else {
      console.log("-> EMPTY ARRAY RETURNED.");
    }
  }
}

main().catch(console.error);
