const token = 'apify_api_ibKagGGKFMueztXM2HxupPOlsDIoVc0Z8hkK';

async function getActorSchema(actorId) {
  const url = `https://api.apify.com/v2/acts/${actorId}`;
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  const data = await res.json();
  console.log(`\n--- Actor: ${actorId} ---`);
  console.log(data);
}

async function run() {
  await getActorSchema('vulnv~linkedin-email-finder');
  await getActorSchema('snipercoder~linkedin-email-finder');
  await getActorSchema('easyapi~linkedin-email-scraper');
}

run().catch(console.error);
