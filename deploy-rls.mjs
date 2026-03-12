import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

console.log('🚀 Deploying RLS policies for product-images bucket...\n');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function deployRLS() {
  try {
    // Read the migration file
    const migrationFile = path.join(__dirname, 'supabase/migrations/20260310006_product_images_rls.sql');
    const migrationSQL = fs.readFileSync(migrationFile, 'utf-8');

    // Split SQL statements by semicolon
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--')); // Remove comments and empty lines

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    let successCount = 0;
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;

      console.log(`[${i + 1}/${statements.length}] Executing statement...`);
      
      // Execute raw SQL via Supabase
      const { error } = await supabase.rpc('exec', { 
        sql_string: statement + ';' 
      }).catch(() => {
        // If exec RPC doesn't exist, try direct query
        return supabase.from('_admin').select().single().catch(err => ({ error: err }));
      });

      if (error) {
        // Some statements might fail (like policies already existing), which is okay
        if (error.message && error.message.includes('already exists')) {
          console.log(`   ⚠️  Policy already exists (skipping)\n`);
        } else if (error.message && error.message.includes('function exec not found')) {
          // Can't use exec function, need alternative
          console.log(`   ⚠️  Cannot execute via RPC (this is expected)\n`);
        } else {
          console.log(`   ⚠️  Statement skipped: ${error.message}\n`);
        }
      } else {
        console.log(`   ✅ Success\n`);
        successCount++;
      }
    }

    console.log('━'.repeat(50));
    console.log(`\n✅ RLS Deployment Status:`);
    console.log(`   - SQL statements processed: ${statements.length}`);
    console.log(`   - Successful executions: ${successCount}`);
    console.log(`\nℹ️  Note: RLS Policies may also be deployed via Supabase Dashboard:`);
    console.log(`   1. Go to https://app.supabase.com`);
    console.log(`   2. Select your project`);
    console.log(`   3. Navigate to Storage > product-images > Policies`);
    console.log(`   4. Create the policies manually if needed\n`);

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Alternative: Use SQL Editor
async function verifySQLDirectMethod() {
  console.log('📝 To apply RLS policies directly via Supabase Dashboard:\n');
  
  const migrationFile = path.join(__dirname, 'supabase/migrations/20260310006_product_images_rls.sql');
  const migrationSQL = fs.readFileSync(migrationFile, 'utf-8');

  console.log('1. Go to Supabase Dashboard → SQL Editor');
  console.log('2. Paste this SQL:\n');
  console.log('━'.repeat(50));
  console.log(migrationSQL);
  console.log('━'.repeat(50));
  console.log('\n3. Click "Run"');
  console.log('4. Done!\n');
}

// Main execution
console.log('ℹ️  Method 1: Attempting to deploy via Supabase API...\n');
deployRLS().then(() => {
  console.log('\n_'.repeat(50));
  console.log('\nℹ️  Method 2: Manual Deployment Instructions:\n');
  verifySQLDirectMethod();
}).catch(err => {
  console.error('Error:', err);
  console.log('\nℹ️  Manual Deployment Instructions:\n');
  verifySQLDirectMethod();
});
