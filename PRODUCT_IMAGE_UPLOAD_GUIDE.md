# Product Image Upload - Setup Guide

## Overview
The product image upload feature allows admins to:
1. **Upload images** to Supabase Storage (product-images bucket)
2. **Preview images** before saving
3. **Use manual URLs** as fallback
4. **Clear and update** images anytime

## Prerequisites

### 1. Create the Supabase Storage Bucket
The `product-images` bucket must exist in Supabase Storage. To create it:

**Via Supabase Dashboard:**
1. Go to Storage in the left sidebar
2. Click "Create a new bucket"
3. Name it: `product-images`
4. Set it to **Public** (to allow image viewing)
5. Click "Create bucket"

**Alternatively, via Supabase CLI:**
```bash
supabase storage create product-images --public
```

### 2. Set RLS Policies (Optional but Recommended)
If you want to restrict upload/delete to admins only:

```sql
-- Allow public read access
CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated Upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
  );

-- Allow users to delete their own uploads
CREATE POLICY "User Delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images'
    AND owner_id = auth.uid()
  );
```

## Features

### Image Upload
- Accepts: JPEG, PNG, WebP, GIF
- Max size: 5MB
- Auto-generated unique filename with timestamp
- Automatic public URL generation
- Loading state during upload

### Image Preview
- Shows preview of uploaded/selected image
- Clear button to remove image
- 160px height preview area

### Fallback URL Input
- Manual URL field for importing external images
- Works independently of upload feature

## Technical Details

### Hook: `useImageUpload`
Location: `src/hooks/useImageUpload.ts`

```typescript
const { uploading, uploadImage } = useImageUpload();

// Usage:
const url = await uploadImage(file);
if (url) {
  setFormData({ ...formData, image_url: url });
}
```

### File Structure
```
product-images/
└── products/
    ├── 1710084000000-abc123.jpg
    ├── 1710084010000-def456.png
    └── ...
```

### Image URL Format
```
https://iiyzyguilixigsbumqmz.supabase.co/storage/v1/object/public/product-images/products/[filename]
```

## Error Handling
- Invalid file type → "Please upload a valid image"
- File too large → "Image size must be less than 5MB"
- Upload failed → Shows error message
- Invalid URL → Shows validation message

## Testing

### Test Upload
1. Go to Admin → Manage Products
2. Click "Add New Product" or Edit existing
3. Click "Upload Image"
4. Select an image file (< 5MB)
5. See preview appear
6. Submit form

### Test Fallback URL
1. Click the URL input field
2. Paste any image URL
3. Preview should update
4. Submit form

### Test Update
1. Edit existing product with image
2. Click "Change Image"
3. Upload different image
4. See preview update
5. Submit to save new image

## Troubleshooting

### "Bucket does not exist"
- Create `product-images` bucket in Supabase Storage
- Ensure it's set to Public

### "Failed to generate image URL"
- Check bucket is public
- Verify bucket name is `product-images`
- Check Supabase project configuration

### Image not showing in product list
- Verify image URL is accessible
- Check Supabase Storage bucket permissions
- Test URL directly in browser

## Future Enhancements
- [ ] Image cropping before upload
- [ ] Multiple images per product
- [ ] Image optimization (resize, compress)
- [ ] Drag-and-drop upload
- [ ] Batch upload
