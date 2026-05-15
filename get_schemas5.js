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
      const res = await fetch(`https://api.apify.com/v2/acts/${id}`);
      const data = await res.json();
      
      const readmeRes = await fetch(`https://api.apify.com/v2/acts/${id}/readme`);
      const readme = await readmeRes.text();
      
      console.log(`\n=== ${id} ===`);
      
      const fields = [];
      if (readme.includes('"startUrls"')) fields.push('startUrls: [{url}]');
      if (readme.includes('"urls"')) fields.push('urls: [url]');
      if (readme.includes('"profileUrls"')) fields.push('profileUrls: [url]');
      if (readme.includes('"linkedinUrls"')) fields.push('linkedinUrls: [url]');
      if (readme.includes('"linkedin"')) fields.push('linkedin: url');
      if (readme.includes('"linkedin_profile_url"')) fields.push('linkedin_profile_url: url');
      if (readme.includes('"profileUrl"')) fields.push('profileUrl: url');
      if (readme.includes('"linkedinUrl"')) fields.push('linkedinUrl: url');
      if (readme.includes('"url"')) fields.push('url');

      console.log("Likely fields from README:", fields.join(' OR '));
    } catch(e) {
      console.log(`Failed for ${id}: ${e.message}`);
    }
  }
}

main().catch(console.error);
