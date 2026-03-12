import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testRLSStatus() {
  console.log('🔍 Testing RLS Policy Status\n');
  console.log('━'.repeat(50));

  // Create test file
  const testFile = new File(['test data'], 'rls-test.txt', { type: 'text/plain' });

  try {
    // Test 1: Try uploading with ANON key (should fail if RLS is enabled)
    console.log('\n1️⃣  Testing ANONYMOUS upload (should fail after RLS)...\n');
    try {
      const { data: uploadData, error: uploadError } = await anonClient
        .storage
        .from('product-images')
        .upload(`test-files/anon-${Date.now()}.txt`, testFile);

      if (uploadError) {
        console.log('   ❌ Upload BLOCKED (RLS Active) ✅');
        console.log(`   Error: ${uploadError.message}\n`);
        return { rlsEnabled: true, anonBlocked: true };
      } else {
        console.log('   ✅ Upload ALLOWED (RLS Not Active Yet)');
        console.log(`   File: ${uploadData?.path}\n`);
        console.log('   ⚠️  RLS POLICIES NOT YET DEPLOYED\n');
        return { rlsEnabled: false, anonBlocked: false };
      }
    } catch (err) {
      console.log('   ❌ Upload BLOCKED ✅');
      console.log(`   Error: ${err.message}\n`);
      return { rlsEnabled: true, anonBlocked: true };
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function testServiceRoleUpload() {
  console.log('2️⃣  Testing SERVICE ROLE upload (should work)...\n');

  try {
    const testFile = new File(['service role test'], `service-${Date.now()}.txt`, { type: 'text/plain' });
    
    const { data, error } = await adminClient
      .storage
      .from('product-images')
      .upload(`test-files/service-${Date.now()}.txt`, testFile);

    if (error) {
      console.log('   ❌ Upload FAILED');
      console.log(`   Error: ${error.message}\n`);
      return false;
    } else {
      console.log('   ✅ Upload ALLOWED (Service Role works)');
      console.log(`   File: ${data?.path}\n`);
      return true;
    }
  } catch (error) {
    console.log('   ❌ Upload FAILED');
    console.log(`   Error: ${error.message}\n`);
    return false;
  }
}

async function main() {
  const result = await testRLSStatus();

  if (!result.anonBlocked) {
    console.log('━'.repeat(50));
    console.log('\n⚠️  RLS POLICIES NOT YET DEPLOYED\n');
    console.log('Status: VULNERABLE - Anonymous users can still upload\n');
    console.log('✅ Action Required:\n');
    console.log('1. Go to: https://app.supabase.com → SQL Editor');
    console.log('2. Paste the SQL policies from deploy-rls-v2.mjs');
    console.log('3. Click "Run"');
    console.log('4. Re-run this test\n');
  } else {
    console.log('━'.repeat(50));
    console.log('\n✅ RLS POLICIES DEPLOYED SUCCESSFULLY\n');
    console.log('Status: SECURE - Anonymous uploads are blocked\n');

    // Test service role
    const serviceRoleWorks = await testServiceRoleUpload();
    if (serviceRoleWorks) {
      console.log('🎉 Security Status: PERFECT');
      console.log('   ✅ Anonymous uploads blocked');
      console.log('   ✅ Service role uploads work\n');
    }
  }

  console.log('━'.repeat(50));
}

main();
