import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const APIFY_TOKEN = Deno.env.get('APIFY_TOKEN') ?? Deno.env.get('APIFY_TOKEN2') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function runApifyActor(actorId: string, input: any) {
  console.log(`Starting ${actorId}...`);
  try {
    const res = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${APIFY_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });
    
    if (!res.ok) {
      const errTxt = await res.text();
      console.error(`Failed to start ${actorId}:`, errTxt);
      return null;
    }
    
    const data = await res.json();
    const runId = data.data.id;
    const defaultDatasetId = data.data.defaultDatasetId;
    console.log(`Run started: ${runId}`);

    let attempts = 0;
    while (attempts < 20) { // Wait up to 60s
      await new Promise(r => setTimeout(r, 3000));
      const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
        headers: { 'Authorization': `Bearer ${APIFY_TOKEN}` }
      });
      const statusData = await statusRes.json();
      const status = statusData.data.status;
      
      if (status === 'SUCCEEDED') break;
      if (status === 'FAILED' || status === 'ABORTED') {
        console.error(`${actorId} failed with status: ${status}`);
        return null;
      }
      attempts++;
    }

    if (attempts >= 20) {
      console.error(`${actorId} timed out.`);
      return null;
    }

    const datasetRes = await fetch(`https://api.apify.com/v2/datasets/${defaultDatasetId}/items`, {
      headers: { 'Authorization': `Bearer ${APIFY_TOKEN}` }
    });
    return await datasetRes.json();
  } catch (err: any) {
    console.error(`Error running ${actorId}:`, err.message);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!APIFY_TOKEN) {
      throw new Error('APIFY_TOKEN is not configured on Supabase. Run: supabase secrets set APIFY_TOKEN=...');
    }
    const { url } = await req.json();
    if (!url) {
      throw new Error('LinkedIn URL is required');
    }

    const result = {
      first_name: null,
      last_name: null,
      company_name: null,
      title: null,
      email: null
    };

    // Step 1: Extract Profile Details
    const profileItems = await runApifyActor('apimaestro~linkedin-profile-detail', { urls: [url] });
    if (profileItems && profileItems.length > 0) {
      const p = profileItems[0];
      result.first_name = p.first_name || p.firstName || null;
      result.last_name = p.last_name || p.lastName || null;
      result.company_name = p.company || p.companyName || null;
      result.title = p.headline || p.title || null;
      
      // If apimaestro doesn't split names, let's try to split the full name
      if (!result.first_name && p.name) {
        const parts = p.name.split(' ');
        result.first_name = parts[0];
        result.last_name = parts.slice(1).join(' ');
      }
      
      // Try to get company from experiences if not at top level
      if (!result.company_name && p.experiences && p.experiences.length > 0) {
         result.company_name = p.experiences[0].company;
         result.title = p.experiences[0].title;
      }
    }

    // Step 2: Waterfall Email Finders
    // Step 2: Waterfall Email Finders
    console.log(`Starting email waterfall for ${url}...`);
    
    // Actor 1: anchor/linkedin-to-email (Proved to work for test profiles!)
    const emailRes1 = await runApifyActor('anchor~linkedin-to-email', { url });
    if (emailRes1 && emailRes1.length > 0 && emailRes1[0].email) {
      result.email = emailRes1[0].email;
    } else {
      // Actor 2: vulnv/linkedin-email-finder
      console.log('Actor 1 failed, trying Actor 2 (vulnv/linkedin-email-finder)...');
      const emailRes2 = await runApifyActor('vulnv~linkedin-email-finder', { urls: [url] });
      if (emailRes2 && emailRes2.length > 0 && emailRes2[0].email) {
        result.email = emailRes2[0].email;
      } else {
        // Actor 3: snipercoder/linkedin-email-finder
        console.log('Actor 2 failed, trying Actor 3 (snipercoder/linkedin-email-finder)...');
        const emailRes3 = await runApifyActor('snipercoder~linkedin-email-finder', { urls: [url] });
        if (emailRes3 && emailRes3.length > 0 && emailRes3[0].email) {
          result.email = emailRes3[0].email;
        } else {
          // Actor 4: easyapi/linkedin-email-scraper
          console.log('Actor 3 failed, trying Actor 4 (easyapi/linkedin-email-scraper)...');
          const emailRes4 = await runApifyActor('easyapi~linkedin-email-scraper', { startUrls: [{ url }] });
          if (emailRes4 && emailRes4.length > 0 && emailRes4[0].email) {
            result.email = emailRes4[0].email;
          }
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
