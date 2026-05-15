const ACTORS = [
  'anchor/linkedin-to-email',
  'vulnv/linkedin-email-finder',
  'snipercoder/linkedin-email-finder',
  'snipercoder/bulk-linkedin-email-finder',
  'x_guru/linkedin-email-Scraper-no-cookies',
  'x_guru/linkedin-email-scraper-no-cookies',
  'easyapi/linkedin-email-scraper',
  'blitzapi/linkedin-email-finder',
  'apimaestro/linkedin-profile-detail',
  'apimaestro/linkedin-profile-batch-scraper-no-cookies-required',
  'apimaestro/linkedin-profile-full-sections-scraper',
  'harvestapi/linkedin-profile-scraper',
  'dev_fusion/linkedin-profile-scraper',
  'anchor/linkedin-profile-enrichment',
  'vulnv/linkedin-profile-scraper',
  'crawlerbros/linkedin-profile-scraper'
];

async function main() {
  for (const id of ACTORS) {
    try {
      const res = await fetch(`https://apify.com/${id}`);
      const text = await res.text();
      
      const match = text.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
      if (match) {
        const data = JSON.parse(match[1]);
        const build = data.props?.pageProps?.actor?.defaultBuild;
        if (build?.inputSchema) {
          let schema = typeof build.inputSchema === 'string' ? JSON.parse(build.inputSchema) : build.inputSchema;
          console.log(`\n=== ${id.replace('/', '~')} ===`);
          const fields = Object.keys(schema.properties || {});
          
          // Look for the URL field
          const urlFields = fields.filter(f => f.toLowerCase().includes('url') || f.toLowerCase().includes('linkedin') || f.toLowerCase().includes('profile'));
          
          let result = urlFields.length > 0 ? urlFields[0] : 'UNKNOWN';
          
          if (fields.includes('startUrls')) result = 'startUrls: [{url}]';
          else if (fields.includes('urls')) result = 'urls: [url]';
          else if (fields.includes('profileUrls')) result = 'profileUrls: [url]';
          else if (fields.includes('linkedinUrls')) result = 'linkedinUrls: [url]';
          else if (fields.includes('linkedin_profile_url')) result = 'linkedin_profile_url: url';
          else if (fields.includes('linkedinUrl')) result = 'linkedinUrl: url';
          else if (fields.includes('linkedin')) result = 'linkedin: url';
          else if (fields.includes('profileUrl')) result = 'profileUrl: url';
          
          console.log("Correct input:", result);
          console.log("All Fields:", fields);
        } else {
           console.log(`\n=== ${id.replace('/', '~')} === No input schema found in HTML`);
        }
      }
    } catch(e) {
      console.log(`Failed for ${id}: ${e.message}`);
    }
  }
}

main().catch(console.error);
