const token = 'apify_api_ibKagGGKFMueztXM2HxupPOlsDIoVc0Z8hkK';

const testUrls = [
  "https://in.linkedin.com/in/nikhilkamathcio"
];

async function runActor(actorId, input) {
  try {
    const res = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });
    
    if (!res.ok) {
      return { actorId, success: false, reason: 'Failed to start' };
    }
    
    const data = await res.json();
    const runId = data.data.id;
    const defaultDatasetId = data.data.defaultDatasetId;

    let attempts = 0;
    while (attempts < 20) {
      await new Promise(r => setTimeout(r, 3000));
      const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statusData = await statusRes.json();
      const status = statusData.data.status;
      if (status === 'SUCCEEDED') break;
      if (status === 'FAILED' || status === 'ABORTED') {
        return { actorId, success: false, reason: `Status: ${status}` };
      }
      attempts++;
    }

    if (attempts >= 20) return { actorId, success: false, reason: 'Timeout' };

    const datasetRes = await fetch(`https://api.apify.com/v2/datasets/${defaultDatasetId}/items`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const dataset = await datasetRes.json();
    
    // Check if email exists in any item
    const emailFound = dataset.find(item => item.email || item.email_address || item.emails);
    
    return { actorId, success: !!emailFound, data: dataset };
  } catch (err) {
    return { actorId, success: false, reason: err.message };
  }
}

async function testAll() {
  const actorsToTest = [
    { id: 'vulnv~linkedin-email-finder', input: { urls: testUrls } },
    { id: 'snipercoder~linkedin-email-finder', input: { urls: testUrls } },
    { id: 'easyapi~linkedin-email-scraper', input: { startUrls: testUrls.map(url => ({url})) } },
    { id: 'x_guru~linkedin-email-Scraper-no-cookies', input: { startUrls: testUrls.map(url => ({url})) } },
    { id: 'apimaestro~linkedin-profile-search-scraper', input: { searchTerms: testUrls } },
    { id: 'snipercoder~bulk-linkedin-email-finder', input: { urls: testUrls } }
  ];

  console.log("Testing actors simultaneously...");
  
  const promises = actorsToTest.map(actor => runActor(actor.id, actor.input));
  const results = await Promise.all(promises);
  
  results.forEach(res => {
    console.log(`\n--- ${res.actorId} ---`);
    console.log(`Success: ${res.success}`);
    if (res.success) {
      console.log(`Email Data:`, JSON.stringify(res.data, null, 2).substring(0, 500) + '...');
    } else {
      console.log(`Reason/Output:`, res.reason || JSON.stringify(res.data));
    }
  });
}

testAll().catch(console.error);
