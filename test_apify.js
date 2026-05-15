const token = 'apify_api_ibKagGGKFMueztXM2HxupPOlsDIoVc0Z8hkK';

async function searchActors() {
  const url = 'https://api.apify.com/v2/store?search=email%20linkedin';
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  const items = data.data?.items || [];
  console.log("Top 10 Email Actors found:");
  items.slice(0, 10).forEach(a => {
    console.log(`- ${a.username}/${a.name}`);
  });
}

searchActors().catch(console.error);
