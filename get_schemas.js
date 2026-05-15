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
      const res = await fetch(`https://api.apify.com/v2/acts/${id}?token=${TOKEN}`);
      const data = await res.json();
      
      const defaultRunOptions = data.data?.defaultRunOptions || {};
      const exampleInput = data.data?.exampleRunInput || {};
      
      console.log(`\n=== ${id} ===`);
      
      // Let's get the schema from the default build if possible
      let schemaUrl = '';
      if (data.data?.defaultBuildId) {
         const buildRes = await fetch(`https://api.apify.com/v2/actor-builds/${data.data.defaultBuildId}?token=${TOKEN}`);
         const buildData = await buildRes.json();
         const inputSchema = buildData.data?.inputSchema;
         if (inputSchema) {
            try {
              const schemaObj = typeof inputSchema === 'string' ? JSON.parse(inputSchema) : inputSchema;
              console.log("Required fields:", schemaObj.required);
              console.log("Properties keys:", Object.keys(schemaObj.properties || {}));
            } catch(e) {
               console.log("Failed to parse schema");
            }
         }
      }
    } catch(e) {
      console.log(`Failed for ${id}: ${e.message}`);
    }
  }
}

main().catch(console.error);
