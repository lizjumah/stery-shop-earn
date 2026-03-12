# Image Upload Security Analysis & Recommendations

**Date:** March 10, 2026  
**Current Status:** 🔴 **SECURITY ISSUE - ACTION REQUIRED**

## Current Implementation

The current `useImageUpload` hook uploads directly to Supabase Storage from the frontend using the **anon key**:

```typescript
// Current: INSECURE
const { data, error } = await supabase.storage
  .from('product-images')
  .upload(`products/${filename}`, file);
```

## Security Issues

| Issue | Severity | Impact |
|-------|----------|--------|
| Frontend uploads with anon key | **CRITICAL** | No admin verification; anyone can upload arbitrary files |
| No backend validation | **HIGH** | Files aren't validated server-side; client-side checks are bypassable |
| No RLS policies | **HIGH** | Storage bucket has default permissions; no access control |
| No rate limiting | **MEDIUM** | Can be used for DoS attacks (disk space exhaustion) |
| No file integrity checks | **MEDIUM** | No server-side verification of file type/size |

## Correct Security Model

### 1. **Product Images Should Be Public (READ)**
- Anyone can view product images
- Used in storefront, order history, etc.

### 2. **Uploads Should Be Admin-Only (WRITE/DELETE)**
- Only backend service role should upload/delete
- Not accessible to frontend even with authentication

### 3. **Proper RLS Policies Required**
```sql
-- Allow public read access
CREATE POLICY "Public Read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Deny all other access (will be handled by backend service_role)
CREATE POLICY "Deny Anon/Authenticated"
  ON storage.objects FOR INSERT
  USING (false);

CREATE POLICY "Deny Anon/Authenticated Delete"
  ON storage.objects FOR DELETE
  USING (false);

-- Service role bypasses RLS, so backend can upload/delete
```

## Recommended Implementation

### Architecture:
```
Frontend (ManageProducts.tsx)
    ↓ (File + Admin ID)
Backend API (POST /api/admin/images/upload)
    ↓ (Verify admin)
Supabase Storage (service_role)
    ↓ (Public blob)
Customers view images
```

### Backend Endpoint

**POST /api/admin/images/upload**

**Headers:**
```
X-Customer-ID: {admin_customer_id}
Content-Type: multipart/form-data
```

**Request:**
```
file: <binary image data>
```

**Response (200):**
```json
{
  "success": true,
  "url": "https://iiyzyguilixigsbumqmz.supabase.co/storage/v1/object/public/product-images/products/1710084000000-abc123.jpg"
}
```

**Validations:**
✓ Admin verification (X-Customer-ID header)  
✓ File type validation (MIME type)  
✓ File size limit (5MB)  
✓ Server-side virus scanning (optional: integrate ClamAV)  
✓ Rate limiting (max 10 uploads per admin per minute)  

### Updated Frontend Hook

```typescript
export async function uploadImage(file: File): Promise<string | null> {
  const customerId = localStorage.getItem('customer_id');
  
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('http://localhost:3000/api/admin/images/upload', {
    method: 'POST',
    headers: {
      'X-Customer-ID': customerId || '',
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  const data = await response.json();
  return data.url;
}
```

## Implementation Checklist

- [ ] Create RLS policies for product-images bucket
- [ ] Create backend endpoint: POST /api/admin/images/upload
- [ ] Add multer middleware for file handling
- [ ] Update useImageUpload to use backend endpoint
- [ ] Test upload with admin verification
- [ ] Test unauthorized upload rejection
- [ ] Document storage bucket configuration
- [ ] Add rate limiting middleware
- [ ] Optional: Add file scanning before storage

## Immediate Actions Required

1. **Add RLS Policies** (via Supabase dashboard or migration)
2. **Create Backend Endpoint** (src/server/api/admin.ts)
3. **Update Frontend Hook** (src/hooks/useImageUpload.ts)
4. **Test Security** (attempt unauthorized upload)

## Files to Modify

- `src/server/api/admin.ts` — Add image upload endpoint
- `src/hooks/useImageUpload.ts` — Use backend instead of frontend upload
- `supabase/migrations/...` — Add RLS policies (new file)

## Bucket Configuration Reference

**Bucket Name:** `product-images`  
**Access Level:** Public (for viewing)  
**Size Limit:** 100 GB (default)  
**Upload Path:** `products/{filename}`  
**URL Pattern:** `https://iiyzyguilixigsbumqmz.supabase.co/storage/v1/object/public/product-images/products/{filename}`
