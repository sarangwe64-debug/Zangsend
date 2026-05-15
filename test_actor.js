const TOKEN = 'apify_api_DgnvKfO37PtqUZGcZKn6bNzvhKdbXq4jViUV';
const TEST_URL = 'https://www.linkedin.com/in/williamhgates/';

async function tryRun(actorId, input) {
  console.log(`\nTrying ${actorId} with input:`, JSON.stringify(input));
  const res = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  const data = await res.json();
  if (!res.ok) {
    console.log(`  ❌ Failed (${res.status}): ${data.error?.message}`);
    return false;
  }
  const runId = data.data.id;
  console.log(`  ✅ Run started! ID: ${runId}`);
  console.log(`  Track: https://console.apify.com/actors/runs/${runId}`);
  
  // Poll 5 mins
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const s = await (await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    })).json();
    const status = s.data.status;
    process.stdout.write(`\r  [${(i+1)*5}s] Status: ${status}   `);
    
    if (status === 'SUCCEEDED') {
      const items = await (await fetch(`https://api.apify.com/v2/datasets/${s.data.defaultDatasetId}/items`, {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
      })).json();
      console.log(`\n  ✅ SUCCEEDED! Result:`, JSON.stringify(items, null, 2));
      return true;
    }
    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
      console.log(`\n  ❌ Stopped: ${status}`);
      return false;
    }
  }
  console.log('\n  ⚠️ Timed out');
  return false;
}

async function main() {
  // anchor needs startUrls format
  const found1 = await tryRun('anchor~linkedin-to-email', {
    startUrls: [{ url: TEST_URL }]
  });

  if (!found1) {
    // vulnv needs urls array
    const found2 = await tryRun('vulnv~linkedin-email-finder', {
      urls: [TEST_URL]
    });

    if (!found2) {
      // snipercoder
      await tryRun('snipercoder~linkedin-email-finder', {
        urls: [TEST_URL]
      });
    }
  }
}

main().catch(console.error);
