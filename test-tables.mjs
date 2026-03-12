// Quick test to check if new admin tables exist in Supabase
import { createClient } from '@supabase/supabase-js';

const URL = 'https://iiyzyguilixigsbumqmz.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpeXp5Z3VpbGl4aWdzYnVtcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDkzNzEsImV4cCI6MjA4ODYyNTM3MX0.J6fvqiQBWRvSmJlhy63fnb61YXlByTol6J1xFZ0UJ1E';

const supabase = createClient(URL, KEY);

async function testTables() {
  console.log('Testing if new admin tables exist in Supabase...\n');

  const tables = [
    'staff_users',
    'delivery_routes',
    'audit_log',
    'stock_alerts',
    'commission_approvals',
  ];

  for (const table of tables) {
    try {
      console.log(`Checking ${table}...`);
      const { data, error } = await supabase.from(table).select('count').limit(0);
      
      if (error) {
        if (error.code === '42P01') {
          console.log(`  ❌ Table does NOT exist: ${table}\n`);
        } else {
          console.log(`  ⚠️  Error: ${error.message}\n`);
        }
      } else {
        console.log(`  ✅ Table EXISTS: ${table}\n`);
      }
    } catch (err) {
      console.log(`  ❌ Error querying ${table}: ${err}\n`);
    }
  }
}

testTables();
