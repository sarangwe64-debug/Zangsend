const token = 'apify_api_ibKagGGKFMueztXM2HxupPOlsDIoVc0Z8hkK';

const testUrls = [
  "https://in.linkedin.com/in/nikhilkamathcio",
  "https://linkedin.com/in/eshwaragarwal"
];

async function runActor(actorId, input) {
  console.log(`Starting ${actorId}...`);
  try {
    const res = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });
    const data = await res.json();
    if (!data.data || !data.data.id) {
      console.log(`Failed to start ${actorId}`, data);
      return null;
    }
    const runId = data.data.id;
    const defaultDatasetId = data.data.defaultDatasetId;
    console.log(`Run started: ${runId}. Waiting for completion...`);

    // Poll for completion
    while (true) {
      await new Promise(r => setTimeout(r, 3000));
      const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statusData = await statusRes.json();
      const status = statusData.data.status;
      if (status === 'SUCCEEDED') {
        break;
      } else if (status === 'FAILED' || status === 'ABORTED') {
        console.log(`${actorId} failed with status: ${status}`);
        return null;
      }
    }

    // Get results
    const datasetRes = await fetch(`https://api.apify.com/v2/datasets/${defaultDatasetId}/items`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const dataset = await datasetRes.json();
    return dataset;
  } catch (err) {
    console.error(`Error running ${actorId}:`, err.message);
    return null;
  }
}

async function test() {
  // Test 1: vulnv/linkedin-email-finder
  console.log("--- Testing vulnv/linkedin-email-finder ---");
  const res1 = await runActor('vulnv~linkedin-email-finder', { profileUrls: testUrls });
  console.log("Result 1:", JSON.stringify(res1, null, 2));

  // Test 2: easyapi/linkedin-email-scraper (input format: linkedinUrls or urls?)
  // Let's guess 'urls' or 'profileUrls' or 'startUrls'
  console.log("--- Testing easyapi/linkedin-email-scraper ---");
  const res2 = await runActor('easyapi~linkedin-email-scraper', { startUrls: testUrls.map(url => ({url})) });
  console.log("Result 2:", JSON.stringify(res2, null, 2));
}

test().catch(console.error);
