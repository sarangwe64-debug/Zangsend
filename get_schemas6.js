const TOKEN = 'apify_api_DgnvKfO37PtqUZGcZKn6bNzvhKdbXq4jViUV';

const ACTORS = [
  'anchor~linkedin-to-email',
  'vulnv~linkedin-email-finder',
  'snipercoder~linkedin-email-finder',
  'snipercoder~bulk-linkedin-email-finder',
  'x_guru~linkedin-email-Scraper-no-cookies',
  'x_guru~linkedin-email-scraper-no-cookies',
  'easyapi~linkedin-email-scraper',
  'blitzapi~linkedin-email-finder',
  'apimaestro~linkedin-profile-detail',
  'apimaestro~linkedin-profile-batch-scraper-no-cookies-required',
  'apimaestro~linkedin-profile-full-sections-scraper',
  'harvestapi~linkedin-profile-scraper',
  'dev_fusion~linkedin-profile-scraper',
  'anchor~linkedin-profile-enrichment',
  'vulnv~linkedin-profile-scraper',
  'crawlerbros~linkedin-profile-scraper'
];

async function main() {
  for (const id of ACTORS) {
    try {
      const res = await fetch(`https://api.apify.com/v2/acts/${id}/runs`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dummy_field: 123 }), // Intentionally bad
      });
      const text = await res.text();
      let errorMsg = '';
      try {
        errorMsg = JSON.parse(text).error.message;
      } catch(e) {
        errorMsg = text.slice(0, 100);
      }
      
      console.log(`\n=== ${id} ===`);
      console.log(`Error: ${errorMsg}`);
    } catch(e) {
      console.log(`Failed for ${id}: ${e.message}`);
    }
  }
}

main().catch(console.error);
