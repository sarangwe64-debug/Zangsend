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

    let attempts = 0;
    while (attempts < 20) {
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
      attempts++;
    }

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
  console.log("--- Extracting Profile Details (apimaestro/linkedin-profile-detail) ---");
  const profiles = await runActor('apimaestro~linkedin-profile-detail', { urls: testUrls });
  console.log("Profile Results:", JSON.stringify(profiles, null, 2));

  console.log("--- Extracting Emails (vulnv/linkedin-email-finder) ---");
  const emails = await runActor('vulnv~linkedin-email-finder', { urls: testUrls });
  console.log("Email Results:", JSON.stringify(emails, null, 2));
}

test().catch(console.error);
