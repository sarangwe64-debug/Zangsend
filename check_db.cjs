const { Client } = require('pg');
const c = new Client({
  connectionString: 'postgresql://postgres:nVfOd8PrZrV3UbzD@db.xhwpiagznwkoroitoulz.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

c.connect()
  .then(() => c.query(`
    SELECT conname, conrelid::regclass as child_table, confdeltype 
    FROM pg_constraint 
    WHERE confrelid = 'lists'::regclass 
    AND contype = 'f'
  `))
  .then(r => {
    console.log('Tables referencing lists:', JSON.stringify(r.rows, null, 2));
    c.end();
  })
  .catch(e => { console.error(e.message); c.end(); });
