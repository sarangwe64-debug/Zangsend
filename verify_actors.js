// Verify which Apify actors exist and accept LinkedIn URLs
const TOKEN = 'apify_api_DgnvKfO37PtqUZGcZKn6bNzvhKdbXq4jViUV';
const TEST_URL = 'https://www.linkedin.com/in/williamhgates/';

const ACTORS_TO_TEST = [
  // Confirmed
  { id: 'anchor~linkedin-to-email',                    input: { startUrls: [{ url: TEST_URL }] } },
  { id: 'vulnv~linkedin-email-finder',                 input: { urls: [TEST_URL] } },
  { id: 'snipercoder~linkedin-email-finder',           input: { urls: [TEST_URL] } },
  { id: 'apimaestro~linkedin-profile-detail',          input: { urls: [TEST_URL] } },
  { id: 'code_crafter~leads-finder',                   input: { urls: [TEST_URL] } },
  // To verify
  { id: 'dev_fusion~linkedin-profile-scraper',         input: { startUrls: [{ url: TEST_URL }] } },
  { id: 'harvestapi~linkedin-profile-detail-actor',    input: { startUrls: [{ url: TEST_URL }] } },
  { id: 'bebity~linkedin-profile-details-scraper',     input: { startUrls: [{ url: TEST_URL }] } },
  { id: 'blitzapi~linkedin-email-finder',              input: { linkedinUrls: [TEST_URL] } },
  { id: 'kpturner~email-finder-from-linkedin',         input: { profileUrl: TEST_URL } },
  { id: 'epctex~linkedin-scraper',                     input: { startUrls: [{ url: TEST_URL, method: 'GET' }] } },
  { id: 'scrapingdog~linkedin-profile-scraper',        input: { profileUrl: TEST_URL } },
  { id: 'lhotanova~linkedin-profile-url-to-email',     input: { urls: [TEST_URL] } },
  { id: 'maxcopell~linkedin-email-finder',             input: { linkedinUrl: TEST_URL } },
  { id: 'vdrmota~linkedin-email-finder',               input: { urls: [TEST_URL] } },
  { id: 'pratikdaigavane~email-find-from-linkedin-profil', input: { linkedinUrl: TEST_URL } },
  { id: 'bhansalisoft~linkedin-email-scraper',         input: { profileUrls: [TEST_URL] } },
  { id: 'tomas_dvorak~linkedin-profile-scraper',       input: { startUrls: [{ url: TEST_URL }] } },
  { id: 'curious_coder~linkedin-email-extractor',      input: { linkedinUrl: TEST_URL } },
  { id: 'dtrungtin~linkedin-profile-scraper',          input: { startUrls: [{ url: TEST_URL }] } },
  { id: 'arto~linkedin-people-search-export',          input: { profileUrls: [TEST_URL] } },
  { id: 'social_scraper~linkedin-profile-scraper',     input: { profileUrls: [TEST_URL] } },
  { id: 'axesso~linkedin-scraper',                     input: { url: TEST_URL } },
  { id: 'web_scraper~linkedin-contacts-scraper',       input: { startUrls: [{ url: TEST_URL }] } },
  { id: 'drobnikj~linkedin-companies-posts-scraper',   input: { startUrls: [{ url: TEST_URL }] } },
  { id: 'memo23~linkedin-email-finder',                input: { urls: [TEST_URL] } },
  { id: 'lukaskrivka~linked-email-finder',             input: { urls: [TEST_URL] } },
  { id: 'pratikdaigavane~linkedin-email-scraper',      input: { urls: [TEST_URL] } },
  { id: 'tri_angle~linkedin-email-extractor',          input: { profileUrl: TEST_URL } },
  { id: 'scraper_mind~linkedin-email-scraper',         input: { urls: [TEST_URL] } },
];

async function testActor(actor) {
  const res = await fetch(`https://api.apify.com/v2/acts/${actor.id}/runs`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(actor.input),
  });
  const text = await res.text();

  if (res.status === 201) {
    // Started! Abort immediately (we just want to confirm it exists)
    const runId = JSON.parse(text).data.id;
    await fetch(`https://api.apify.com/v2/actor-runs/${runId}/abort`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}` },
    });
    return { status: '✅ EXISTS', code: res.status };
  } else if (res.status === 404) {
    return { status: '❌ NOT FOUND', code: res.status };
  } else if (res.status === 400) {
    return { status: '⚠️  BAD INPUT (exists but wrong input format)', code: res.status };
  } else if (res.status === 402 || res.status === 403) {
    return { status: '💰 PAID/SUBSCRIPTION REQUIRED', code: res.status };
  } else {
    const snippet = text.slice(0, 100).replace(/\n/g, ' ');
    return { status: `? ${res.status}: ${snippet}`, code: res.status };
  }
}

async function main() {
  console.log(`Testing ${ACTORS_TO_TEST.length} actors...\n`);
  const working = [];
  const failed = [];

  for (const actor of ACTORS_TO_TEST) {
    process.stdout.write(`${actor.id.padEnd(55)} → `);
    const result = await testActor(actor);
    console.log(result.status);
    if (result.code === 201 || result.code === 400) working.push(actor.id);
    else failed.push(actor.id);
    await new Promise(r => setTimeout(r, 300)); // small delay between requests
  }

  console.log(`\n${'─'.repeat(70)}`);
  console.log(`✅ WORKING (${working.length}): ${working.join(', ')}`);
  console.log(`❌ FAILED  (${failed.length}): ${failed.join(', ')}`);
}

main().catch(console.error);
