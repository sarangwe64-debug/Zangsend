const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { requireEnv } = require('./scripts/load-env.cjs');

let connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString) connectionString = requireEnv('DATABASE_URL');

async function main() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const sql = fs.readFileSync(path.join(__dirname, 'add_attachments.sql'), 'utf8');
  await client.query(sql);
  console.log('Attachments schema applied.');
  await client.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
