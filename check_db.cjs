const { Client } = require('pg');
const { requireEnv } = require('./scripts/load-env.cjs');

let connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString) connectionString = requireEnv('DATABASE_URL');

async function main() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1`
  );
  console.log(res.rows.map((r) => r.table_name).join(', '));
  await client.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
