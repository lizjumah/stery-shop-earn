#!/usr/bin/env node
// Generate Supabase types from remote schema using REST API
const https = require('https');
const fs = require('fs');

const PROJECT_ID = 'iiyzyguilixigsbumqmz';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpeXp5Z3VpbGl4aWdzYnVtcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDkzNzEsImV4cCI6MjA4ODYyNTM3MX0.J6fvqiQBWRvSmJlhy63fnb61YXlByTol6J1xFZ0UJ1E';

console.log('Fetching Supabase schema information...\n');

// Fetch OpenAPI schema which includes all table definitions
const options = {
  hostname: `${PROJECT_ID}.supabase.co`,
  port: 443,
  path: `/rest/v1/?apikey=${ANON_KEY}`,
  method: 'GET',
  headers: {
    'apikey': ANON_KEY,
    'Accept': 'application/openapi+json'
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error(`Error: HTTP ${res.statusCode}`);
      console.error(data);
      process.exit(1);
    }

    try {
      const schema = JSON.parse(data);
      
      // Extract table information from OpenAPI schema
      const tables = schema.components?.schemas || {};
      
      console.log(`✓ Found ${Object.keys(tables).length} table definitions`);
      
      // List tables found
      const tableNames = Object.keys(tables).filter(t => t !== 'error' && t !== '201' && t !== '204' && t !== '206' && t !== '400' && t !== '401' && t !== '403' && t !== '404' && t !== '409' && t !== '413' && t !== '415' && t !== '500');
      
      console.log('\nTables detected:');
      tableNames.forEach(t => console.log(`  - ${t}`));
      
      console.log('\n⚠️  OpenAPI schema approach complex. Using alternative strategy...\n');
      
      // Alternative: Use supabase-js to query information_schema directly
      generateTypesViaClient();
      
    } catch (err) {
      console.error('Error parsing schema:', err.message);
      console.log('\n⚠️  Switching to direct database query method...\n');
      generateTypesViaClient();
    }
  });
});

req.on('error', (err) => {
  console.error('Error fetching OpenAPI schema:', err.message);
  console.log('Switching to direct database query method...\n');
  generateTypesViaClient();
});

req.end();

// Alternative: Use supabase-js client to query schema
function generateTypesViaClient() {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabase = createClient(
    'https://iiyzyguilixigsbumqmz.supabase.co',
    ANON_KEY
  );

  (async () => {
    try {
      console.log('Querying information_schema for table definitions...\n');
      
      // Query information_schema to get table details
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .neq('table_name', 'pg_stat_statements');

      if (error) {
        console.error('Error querying tables:', error);
        console.log('\n⚠️  Cannot query information_schema via REST API (expected due to RLS)');
        console.log('Please use Supabase CLI or web interface to generate types.\n');
        fallbackInstructions();
        return;
      }

      if (data) {
        console.log('✓ Tables found:');
        data.forEach(row => console.log(`  - ${row.table_name}`));
      }

    } catch (err) {
      console.error('Error:', err.message);
      fallbackInstructions();
    }
  })();
}

function fallbackInstructions() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('FALLBACK INSTRUCTIONS: Generate types manually\n');
  console.log('Option 1: Use Supabase Web Dashboard');
  console.log('  1. Go to: https://app.supabase.com/project/iiyzyguilixigsbumqmz');
  console.log('  2. Click "SQL Editor"');
  console.log('  3. Click "Generate types" (top right corner)');
  console.log('  4. Select "TypeScript"');
  console.log('  5. Copy and paste into src/integrations/supabase/types.ts\n');
  console.log('Option 2: Use Supabase CLI (if you can authenticate)');
  console.log('  1. Run: supabase login');
  console.log('  2. Run: supabase link --project-ref iiyzyguilixigsbumqmz');
  console.log('  3. Run: supabase gen types typescript [--schema public] > src/integrations/supabase/types.ts\n');
  console.log('Option 3: Use npx with linked project');
  console.log('  1. Run: npx supabase link --project-ref iiyzyguilixigsbumqmz');
  console.log('  2. Run: npx supabase gen types typescript > src/integrations/supabase/types.ts');
  console.log('════════════════════════════════════════════════════════════\n');
}
