// Check RLS status and policies in Supabase
import { createClient } from '@supabase/supabase-js';

const URL = 'https://iiyzyguilixigsbumqmz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpeXp5Z3VpbGl4aWdzYnVtcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDkzNzEsImV4cCI6MjA4ODYyNTM3MX0.J6fvqiQBWRvSmJlhy63fnb61YXlByTol6J1xFZ0UJ1E';

const supabase = createClient(URL, ANON_KEY);

// This query will fail due to RLS, but show us the actual RLS status command
console.log('\nTo check RLS policies, run this in Supabase SQL Editor:\n');

const queries = [
  `-- Check RLS status on admin tables
SELECT tablename, relname, relrowsecurity 
FROM pg_class
JOIN information_schema.tables ON pg_class.relname = information_schema.tables.table_name
WHERE information_schema.tables.table_schema = 'public'
AND pg_class.relname IN ('staff_users', 'audit_log', 'stock_alerts', 'commission_approvals')
ORDER BY tablename;`,

  `-- Check RLS policies on admin tables
SELECT tablename, policyname, cmd, qual, with_check 
FROM pg_policies
WHERE tablename IN ('staff_users', 'audit_log', 'stock_alerts', 'commission_approvals')
ORDER BY tablename, policyname;`,

  `-- Check if SELECT policies allow anon access
SELECT tablename, policyname, qual
FROM pg_policies
WHERE tablename IN ('staff_users', 'audit_log', 'stock_alerts', 'commission_approvals')
AND cmd = 'SELECT'
ORDER BY tablename;`
];

queries.forEach((q, i) => {
  console.log(`QUERY ${i + 1}:`);
  console.log('───────────────────────────────────────────────');
  console.log(q);
  console.log('\n');
});

console.log('IMPORTANT NOTE:');
console.log('──────────────────────────────────────────────');
console.log('The migrations created RLS policies with `USING (auth.role() = \'service_role\')`');
console.log('This should block anon key access (which has role = \'anon\').');
console.log('');
console.log('However, the test shows they are NOT blocked.');
console.log('Possible causes:');
console.log('1. RLS policies may not have been created due to migration errors');
console.log('2. Policies may be too permissive (USING true instead of auth.role check)');
console.log('3. Supabase may need time to propagate policy changes');
console.log('');
console.log('ACTION: Run the queries above in Supabase SQL Editor to verify!');
console.log('──────────────────────────────────────────────\n');
