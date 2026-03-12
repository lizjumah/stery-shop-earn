// Test RLS security - verify anon key cannot access admin tables
import { createClient } from '@supabase/supabase-js';

const URL = 'https://iiyzyguilixigsbumqmz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpeXp5Z3VpbGl4aWdzYnVtcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDkzNzEsImV4cCI6MjA4ODYyNTM3MX0.J6fvqiQBWRvSmJlhy63fnb61YXlByTol6J1xFZ0UJ1E';

const supabase = createClient(URL, ANON_KEY);

async function testRLS() {
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('RLS SECURITY TEST - Verifying Admin Tables');
  console.log('════════════════════════════════════════════════════════════\n');

  const adminTables = [
    'staff_users',
    'audit_log',
    'stock_alerts',
    'commission_approvals'
  ];

  const customerTables = [
    'orders',     // Should be readable
    'customers'   // Should be readable
  ];

  // Test 1: Anon key SHOULD BE BLOCKED from admin tables
  console.log('TEST 1: Anon key blocked from ADMIN tables (should fail with 403)\n');
  
  for (const table of adminTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count', { count: 'exact' })
        .limit(1);

      if (error) {
        if (error.message.includes('403') || error.message.includes('permission')) {
          console.log(`✅ ${table}: BLOCKED (${error.message})`);
        } else {
          console.log(`⚠️  ${table}: Error but unexpected - ${error.message}`);
        }
      } else {
        console.log(`❌ ${table}: NOT BLOCKED - Security issue! Anon key accessed admin table`);
      }
    } catch (err) {
      console.log(`❌ ${table}: Unexpected error - ${err}`);
    }
  }

  // Test 2: Anon key SHOULD WORK for customer tables
  console.log('\nTEST 2: Anon key allowed for CUSTOMER tables (should succeed)\n');
  
  for (const table of customerTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count', { count: 'exact' })
        .limit(1);

      if (error) {
        console.log(`❌ ${table}: FAILED - ${error.message}`);
      } else {
        console.log(`✅ ${table}: ALLOWED (read access working)`);
      }
    } catch (err) {
      console.log(`❌ ${table}: Unexpected error - ${err}`);
    }
  }

  // Test 3: Anon key can INSERT orders (checkout)
  console.log('\nTEST 3: Anon key CAN INSERT orders (checkout functionality)\n');
  
  try {
    const { error } = await supabase
      .from('orders')
      .insert({
        customer_phone: '+254712345678',
        order_number: 'TEST-SECURITY-CHECK',
        items: [],
        subtotal: 0,
        total: 0,
        delivery_fee: 0,
        payment_method: 'test',
        status: 'received'
      })
      .select('id')
      .single();

    if (error) {
      console.log(`❌ INSERT orders failed: ${error.message}`);
    } else {
      console.log(`✅ INSERT orders: SUCCESS (checkout can create orders)`);
    }
  } catch (err) {
    console.log(`❌ INSERT test failed: ${err}`);
  }

  // Test 4: Anon key CANNOT UPDATE orders
  console.log('\nTEST 4: Anon key CANNOT UPDATE orders (should fail)\n');
  
  try {
    // Try to update any order (won't have IDs but should fail on policy)
    const { error } = await supabase
      .from('orders')
      .update({ status: 'delivered' })
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .select();

    if (error) {
      if (error.message.includes('403') || error.message.includes('permission')) {
        console.log(`✅ UPDATE orders: BLOCKED (${error.message})`);
      } else {
        console.log(`⚠️  UPDATE blocked but unexpected error: ${error.message}`);
      }
    } else {
      console.log(`❌ UPDATE orders: NOT BLOCKED - Security issue!`);
    }
  } catch (err) {
    console.log(`✅ UPDATE orders: BLOCKED (${err.message})`);
  }

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('SECURITY TEST COMPLETE');
  console.log('════════════════════════════════════════════════════════════\n');
}

testRLS().catch(console.error);
