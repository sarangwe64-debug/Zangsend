const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { requireEnv } = require('./scripts/load-env.cjs');

let connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString) connectionString = requireEnv('DATABASE_URL');

async function applySchema() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Connecting to database...');
    await client.connect();

    const schemaPath = path.join(__dirname, 'supabase', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema...');
    await client.query(schema);

    console.log('Schema applied successfully.');
  } catch (err) {
    console.error('Error applying schema:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applySchema();
