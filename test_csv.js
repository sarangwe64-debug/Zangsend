import Papa from 'papaparse';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xhwpiagznwkoroitoulz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhod3BpYWd6bndrb3JvaXRvdWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MjM4NDAsImV4cCI6MjA5NDI5OTg0MH0.XJ-HZIZY9pS4oxV4Nzr0YyZik3oUr8Wi0GquOOZis4c';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const fileContent = fs.readFileSync('C:/Users/saran/Downloads/filtered_companies.csv', 'utf8');
  
  let parsedData = [];
  Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().replace(/^\uFEFF/, ''),
    complete: (results) => {
      parsedData = results.data;
    }
  });

  console.log(`Parsed ${parsedData.length} rows`);
  if (parsedData.length > 0) {
    console.log('Sample row:', parsedData[0]);
  }

  // Simulate mapping
  const mapping = {
    company_name: 'Company Name',
    first_name: 'First Name',
    last_name: 'Last Name',
    title: 'Job Title',
    linkedin_url: 'LinkedIn Profile'
  };

  const contacts = parsedData.map(row => ({
    first_name: mapping.first_name ? row[mapping.first_name] : null,
    last_name: mapping.last_name ? row[mapping.last_name] : null,
    company_name: mapping.company_name ? row[mapping.company_name] : null,
    title: mapping.title ? row[mapping.title] : null,
    linkedin_url: mapping.linkedin_url ? row[mapping.linkedin_url] : null,
    status: 'pending'
  })).filter(c => c.linkedin_url || c.first_name || c.last_name || c.company_name);

  console.log(`Valid contacts: ${contacts.length}`);
  if (contacts.length > 0) {
    console.log('Sample contact:', contacts[0]);
  }
}

test();
