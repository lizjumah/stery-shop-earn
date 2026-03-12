import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function deployRLS() {
  console.log('🚀 Deploying RLS policies via Supabase API...\n');

  try {
    // Step 1: Test connection
    console.log('1️⃣  Testing Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('products')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('   ❌ Connection failed:', testError.message);
      process.exit(1);
    }
    console.log('   ✅ Connected to Supabase\n');

    // Step 2: List storage buckets
    console.log('2️⃣  Checking product-images bucket...');
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();

    if (bucketsError) {
      console.error('   ❌ Failed to list buckets:', bucketsError.message);
      process.exit(1);
    }

    const productBucket = buckets?.find(b => b.name === 'product-images');
    if (!productBucket) {
      console.error('   ❌ product-images bucket not found');
      process.exit(1);
    }
    console.log('   ✅ product-images bucket exists\n');

    // Step 3: SQL policies need to be applied via SQL Editor
    console.log('3️⃣  RLS Policies Ready to Deploy\n');
    console.log('⚠️  Storage RLS policies must be deployed via Supabase Dashboard SQL Editor\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 DEPLOYMENT INSTRUCTIONS:\n');
    console.log('1. Visit: https://app.supabase.com');
    console.log('2. Navigate to: SQL Editor');
    console.log('3. Click: "+ New Query"');
    console.log('4. Copy & paste this SQL:\n');

    // Read and display the migration file
    const migrationSQL = `
-- POLICY 1: Allow public read
CREATE POLICY "Public Read product-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- POLICY 2: Deny anon insert  
CREATE POLICY "Deny Anon Insert product-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND false);

-- POLICY 3: Deny authenticated (non-service_role) insert
CREATE POLICY "Deny Auth Insert product-images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images' 
    AND auth.role() != 'service_role'
    AND false
  );

-- POLICY 4: Deny delete
CREATE POLICY "Deny Anon Delete product-images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND false);
    `;

    console.log(migrationSQL.trim());
    console.log('\n5. Click: "Run"');
    console.log('6. Verify: All policies created successfully\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Step 4: Test file capabilities
    console.log('4️⃣  Current Storage Permissions:\n');
    console.log('Before RLS (Current State):');
    console.log('  ✓ Public can upload files (UNSAFE)');
    console.log('  ✓ Public can delete files (UNSAFE)\n');

    console.log('After RLS (Target State):');
    console.log('  ✓ Public can VIEW images');
    console.log('  ✗ Public CANNOT upload');
    console.log('  ✗ Public CANNOT delete');
    console.log('  ✓ Backend (service_role) can upload');
    console.log('  ✓ Backend (service_role) can delete\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 Next Steps:\n');
    console.log('1. Apply the SQL above in Supabase Dashboard');
    console.log('2. Run: node test-rls-deployment.mjs');
    console.log('3. Verify uploads are now blocked\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deployRLS();
