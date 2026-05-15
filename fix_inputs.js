// Fix input formats for actors that returned 400 BAD INPUT
const TOKEN = 'apify_api_DgnvKfO37PtqUZGcZKn6bNzvhKdbXq4jViUV';
const TEST_URL = 'https://www.linkedin.com/in/williamhgates/';

async function tryInput(actorId, inputName, input) {
  const res = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const text = await res.text();
  if (res.status === 201) {
    const runId = JSON.parse(text).data.id;
    await fetch(`https://api.apify.com/v2/actor-runs/${runId}/abort`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${TOKEN}` },
    });
    return `✅ ${res.status} - ${inputName}`;
  }
  const msg = JSON.parse(text)?.error?.message || text.slice(0, 80);
  return `❌ ${res.status} - ${inputName}: ${msg}`;
}

async function main() {
  // snipercoder~linkedin-email-finder
  console.log('\n--- snipercoder~linkedin-email-finder ---');
  console.log(await tryInput('snipercoder~linkedin-email-finder', 'urls array', { urls: [TEST_URL] }));
  console.log(await tryInput('snipercoder~linkedin-email-finder', 'startUrls', { startUrls: [{ url: TEST_URL }] }));
  console.log(await tryInput('snipercoder~linkedin-email-finder', 'linkedinUrls', { linkedinUrls: [TEST_URL] }));
  console.log(await tryInput('snipercoder~linkedin-email-finder', 'profileUrls', { profileUrls: [TEST_URL] }));
  console.log(await tryInput('snipercoder~linkedin-email-finder', 'profileUrl', { profileUrl: TEST_URL }));
  console.log(await tryInput('snipercoder~linkedin-email-finder', 'url', { url: TEST_URL }));

  // dev_fusion~linkedin-profile-scraper
  console.log('\n--- dev_fusion~linkedin-profile-scraper ---');
  console.log(await tryInput('dev_fusion~linkedin-profile-scraper', 'startUrls', { startUrls: [{ url: TEST_URL }] }));
  console.log(await tryInput('dev_fusion~linkedin-profile-scraper', 'profileUrls', { profileUrls: [TEST_URL] }));
  console.log(await tryInput('dev_fusion~linkedin-profile-scraper', 'urls', { urls: [TEST_URL] }));
  console.log(await tryInput('dev_fusion~linkedin-profile-scraper', 'linkedinUrls', { linkedinUrls: [TEST_URL] }));
  console.log(await tryInput('dev_fusion~linkedin-profile-scraper', 'profileUrl', { profileUrl: TEST_URL }));

  // blitzapi~linkedin-email-finder
  console.log('\n--- blitzapi~linkedin-email-finder ---');
  console.log(await tryInput('blitzapi~linkedin-email-finder', 'linkedinUrls', { linkedinUrls: [TEST_URL] }));
  console.log(await tryInput('blitzapi~linkedin-email-finder', 'startUrls', { startUrls: [{ url: TEST_URL }] }));
  console.log(await tryInput('blitzapi~linkedin-email-finder', 'urls', { urls: [TEST_URL] }));
  console.log(await tryInput('blitzapi~linkedin-email-finder', 'profileUrls', { profileUrls: [TEST_URL] }));
  console.log(await tryInput('blitzapi~linkedin-email-finder', 'profileUrl', { profileUrl: TEST_URL }));
  console.log(await tryInput('blitzapi~linkedin-email-finder', 'url', { url: TEST_URL }));
}

main().catch(console.error);
