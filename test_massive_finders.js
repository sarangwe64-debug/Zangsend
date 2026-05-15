const token = 'apify_api_ibKagGGKFMueztXM2HxupPOlsDIoVc0Z8hkK';

const testUrls = ["https://in.linkedin.com/in/nikhilkamathcio"];

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
    while (attempts < 15) { // 45 seconds max
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

    if (attempts >= 15) return { actorId, success: false, reason: 'Timeout' };

    const datasetRes = await fetch(`https://api.apify.com/v2/datasets/${defaultDatasetId}/items`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const dataset = await datasetRes.json();
    
    const emailFound = dataset.find(item => 
      item.email || item.email_address || item.emails || 
      (item.contact_info && item.contact_info.email)
    );
    
    return { actorId, success: !!emailFound, data: dataset };
  } catch (err) {
    return { actorId, success: false, reason: err.message };
  }
}

async function testMassive() {
  console.log("Fetching top actors from Apify store...");
  const searchUrl = 'https://api.apify.com/v2/store?search=email%20linkedin&limit=25';
  const res = await fetch(searchUrl, { headers: { 'Authorization': `Bearer ${token}` } });
  const data = await res.json();
  const actors = data.data?.items || [];
  
  console.log(`Found ${actors.length} actors. Filtering and preparing tests...`);
  
  const promises = actors.map(a => {
    const actorId = `${a.username}~${a.name}`;
    // We try multiple common input formats since we don't know the exact schema for all
    const input = { 
        urls: testUrls, 
        startUrls: testUrls.map(url => ({url})),
        profileUrls: testUrls,
        url: testUrls[0]
    };
    return runActor(actorId, input);
  });

  const results = await Promise.all(promises);
  
  let successes = [];
  results.forEach(res => {
    if (res.success) {
      successes.push(res);
      console.log(`\n✅ SUCCESS: ${res.actorId}`);
      console.log(JSON.stringify(res.data, null, 2).substring(0, 500));
    } else {
      console.log(`❌ FAILED: ${res.actorId} - ${res.reason || 'No email found'}`);
    }
  });

  console.log(`\n--- SUMMARY ---`);
  console.log(`Total Tested: ${actors.length}`);
  console.log(`Successful Hits: ${successes.length}`);
}

testMassive().catch(console.error);
