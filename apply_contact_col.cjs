const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:nVfOd8PrZrV3UbzD@db.xhwpiagznwkoroitoulz.supabase.co:5432/postgres';

async function applySchema() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    
    console.log('Reading add_contact_attachment_col.sql...');
    const schemaPath = path.join(__dirname, 'add_contact_attachment_col.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executing schema...');
    await client.query(schema);
    
    console.log('✅ Schema successfully applied!');
  } catch (err) {
    console.error('❌ Error applying schema:', err.message);
  } finally {
    await client.end();
  }
}

applySchema();
