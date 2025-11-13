// scripts/migrate-clients.js
// Usage: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment, then `node scripts/migrate-clients.js`
// This script is a safe scaffold: it connects to Supabase with the service role key and runs the SQL migration file.

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function run() {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL) {
    console.error('Set SUPABASE_URL (or VITE_SUPABASE_URL) environment variable');
    process.exit(1);
  }
  if (!SERVICE_ROLE) {
    console.error('Set SUPABASE_SERVICE_ROLE_KEY environment variable (service role key required)');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  // Read SQL file
  const migrationPath = path.join(__dirname, '..', 'db', 'migrations', '001_create_client_tables.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Running migration SQL from', migrationPath);

  // Supabase does not have a direct multi-statement query runner in the client; we can call /rpc to run statements
  // but easiest is to call the REST SQL endpoint (not exposed here). Instead we'll run statements by splitting on \n; --
  // THIS IS A SIMPLE APPROACH and may fail on complex SQL; prefer running the .sql file in Supabase SQL editor for reliability.

  const statements = sql.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);

  for (const stmt of statements) {
    try {
      console.log('Executing statement...');
      const res = await supabase.rpc('sql', { sql: stmt }).catch(err => ({ error: err }));
      if (res && res.error) {
        // supabase.rpc('sql') may not exist; this is a placeholder. Better: run migration in Supabase UI.
        console.warn('Statement execution returned error (this script is a scaffold; prefer running in Supabase SQL editor):', res.error);
      }
    } catch (err) {
      console.error('Error executing statement:', err.message || err);
    }
  }

  console.log('Migration script finished. If you see warnings above, run the SQL file directly in Supabase SQL editor for best results.');
}

run().catch(err => { console.error(err); process.exit(1); });
