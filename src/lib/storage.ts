import { supabase } from '@/integrations/supabase/client';

/**
 * Verify that the product-images bucket exists in Supabase Storage
 * Call this during app initialization to warn admins if bucket is missing
 */
export async function verifyProductImagesBucket(): Promise<boolean> {
  try {
    // Try to list files in the bucket
    const { data, error } = await supabase.storage
      .from('product-images')
      .list('products', { limit: 1 });

    if (error) {
      console.warn('⚠️  Product images bucket not found:', error.message);
      return false;
    }

    console.log('✓ Product images bucket is accessible');
    return true;
  } catch (err) {
    console.warn('⚠️  Failed to verify product images bucket:', err);
    return false;
  }
}

/**
 * Get public URL for a product image
 */
export function getProductImageUrl(filename: string): string {
  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(`products/${filename}`);
  return data.publicUrl;
}
