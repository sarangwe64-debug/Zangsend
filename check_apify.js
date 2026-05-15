const TOKEN = 'apify_api_DgnvKfO37PtqUZGcZKn6bNzvhKdbXq4jViUV';

const actors = [
  'anchor~linkedin-to-email',
  'vulnv~linkedin-email-finder', 
  'snipercoder~linkedin-email-finder',
  'easyapi~linkedin-email-scraper',
  'apimaestro~linkedin-profile-detail',
];

async function testActor(actorId) {
  // First check if actor exists
  const infoRes = await fetch(`https://api.apify.com/v2/acts/${actorId}`, {
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  });
  const infoData = await infoRes.json();
  
  if (infoRes.status !== 200) {
    console.log(`❌ ${actorId}: NOT FOUND (${infoRes.status}) - ${infoData.error?.message || ''}`);
    return;
  }
  
  const actor = infoData.data;
  console.log(`✅ ${actorId}: EXISTS - "${actor.name}" by ${actor.username}`);
  console.log(`   Pricing: ${actor.pricingInfos?.[0]?.pricingModel || 'unknown'}`);
}

async function main() {
  console.log('Testing Apify account...');
  const meRes = await fetch('https://api.apify.com/v2/users/me', {
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  });
  const me = await meRes.json();
  console.log(`Account: ${me.data?.username} | Plan: ${me.data?.plan?.id} | Usage: $${me.data?.monthlyUsage?.totalCostUsd || 0}\n`);

  for (const actor of actors) {
    await testActor(actor);
  }
}

main().catch(console.error);
