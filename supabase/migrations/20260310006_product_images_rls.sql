-- MIGRATION 20260310006: Product Images Storage Security
-- RLS Policies for product-images bucket
-- Auth Model: Public read, service_role write/delete only
-- Date: March 10, 2026
-- ====================================================================

-- Step 1: Enable RLS on storage.objects (if not already enabled)
-- Note: This is typically already enabled by default in Supabase

-- Step 2: Create policies for product-images bucket

-- Policy 1: Allow public read (everyone can view images)
CREATE POLICY "Public Read product-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Policy 2: Deny all frontend/anon insert
-- (Backend service_role bypasses RLS and can still upload)
CREATE POLICY "Deny Anon Insert product-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND false);

-- Policy 3: Deny all authenticated insert (not admin)
-- (Only service_role can insert, which bypasses this policy)
CREATE POLICY "Deny Auth Insert product-images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images' 
    AND auth.role() != 'service_role'
    AND false
  );

-- Policy 4: Deny delete from public/anon
CREATE POLICY "Deny Anon Delete product-images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND false);

-- ====================================================================
-- SECURITY MODEL VERIFICATION:
--
-- Public (Anon Key):
-- ✓ Can read objects (view images)
-- ✗ Cannot insert (upload)
-- ✗ Cannot delete
--
-- Backend (Service Role Key):
-- ✓ Can read objects
-- ✓ Can insert (upload) - bypasses RLS
-- ✓ Can delete - bypasses RLS
--
-- Authenticated Users:
-- ✓ Can read objects
-- ✗ Cannot insert (unless they are backend service role)
-- ✗ Cannot delete
--
-- ====================================================================
