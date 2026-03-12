# Image Upload Security — Quick Setup Guide

## Phase 1: Deploy RLS Policies (URGENT - 5 minutes)

### Option A: Supabase CLI (Recommended)
```bash
cd /path/to/stery-shop-earn

# Deploy migration
supabase db push

# Verify policies were created
supabase storage list product-images
```

### Option B: Supabase Dashboard
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Storage** → **product-images**
4. Click **Policies** tab
5. Create 4 policies manually (see supabase/migrations/20260310006_product_images_rls.sql)

### Option C: Run SQL Directly
1. Go to SQL Editor in Supabase
2. Copy contents of `supabase/migrations/20260310006_product_images_rls.sql`
3. Paste and execute

## Verification: Is RLS Working?

### Test 1: Public Read Should Work
```bash
# This should return the image (public access)
curl https://iiyzyguilixigsbumqmz.supabase.co/storage/v1/object/public/product-images/products/sample.jpg
```

### Test 2: Anonymous Upload Should Fail
```bash
# Get your anon key from .env.local (VITE_SUPABASE_ANON_KEY)
curl -X POST \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/octet-stream" \
  -d @test.jpg \
  "https://iiyzyguilixigsbumqmz.supabase.co/storage/v1/object/product-images/products/test.jpg"

# Expected response: 403 Forbidden or permission denied
```

### Test 3: Service Role Upload Should Work
```bash
# Get your service role key from Supabase settings (SUPABASE_SERVICE_ROLE_KEY)
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/octet-stream" \
  -d @test.jpg \
  "https://iiyzyguilixigsbumqmz.supabase.co/storage/v1/object/product-images/products/test.jpg"

# Expected response: 200 OK with upload confirmation
```

## Phase 2: Implement Backend (30 minutes)

### Step 1: Install Dependencies
```bash
npm install multer
npm install --save-dev @types/multer
```

### Step 2: Configure Multer in Backend
Edit `src/server/index.ts`:

```typescript
import multer from 'multer';

// ... existing imports and code ...

const app = express();

// Create multer instance (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (validMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// Add multer middleware to admin routes
app.use('/api/admin', upload.single('file'));

// ... rest of middleware setup ...
```

### Step 3: Uncomment Backend Implementation
In `src/server/api/admin.ts`, find the image upload endpoint and uncomment the implementation (currently commented out).

### Step 4: Test Backend
```bash
npm run dev:backend

# In another terminal:
curl -X POST http://localhost:3000/api/admin/images/upload \
  -H "X-Customer-ID: d0240c2d-5f70-4331-83ee-466908f177ca" \
  -F "file=@test.jpg"

# Expected response:
# {
#   "success": true,
#   "message": "Image uploaded successfully",
#   "url": "https://..../product-images/products/1710084000000-abc123.jpg"
# }
```

## Phase 3: Update Frontend (15 minutes)

Update `src/hooks/useImageUpload.ts`:

```typescript
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface UseImageUploadReturn {
  uploading: boolean;
  uploadImage: (file: File) => Promise<string | null>;
}

export function useImageUpload(): UseImageUploadReturn {
  const [uploading, setUploading] = useState(false);

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    try {
      // Validate file
      if (!file) {
        toast.error('No file selected');
        return null;
      }

      // Check file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a valid image');
        return null;
      }

      // Check file size (5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('Image size must be less than 5MB');
        return null;
      }

      setUploading(true);

      // Upload via backend (not directly to Supabase)
      const formData = new FormData();
      formData.append('file', file);

      const customerId = localStorage.getItem('customer_id');
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

      const response = await fetch(`${backendUrl}/api/admin/images/upload`, {
        method: 'POST',
        headers: {
          'X-Customer-ID': customerId || '',
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || 'Upload failed');
        return null;
      }

      const data = await response.json();
      toast.success('Image uploaded successfully');
      return data.url;
    } catch (err) {
      console.error('Image upload error:', err);
      toast.error('Failed to upload image');
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  return {
    uploading,
    uploadImage,
  };
}
```

## Phase 4: Security Testing (20 minutes)

### Test Checklist
- [ ] Anonymous upload fails (403 Forbidden)
- [ ] Non-admin upload fails (not verified)
- [ ] Admin upload succeeds and returns URL
- [ ] Public can view uploaded images
- [ ] File size validation works (> 5MB rejected)
- [ ] File type validation works (non-images rejected)
- [ ] Image appears in ManageProducts
- [ ] No console errors or warnings

### Manual Testing Commands

```bash
# Test 1: No authentication → Should fail
curl -X POST http://localhost:3000/api/admin/images/upload \
  -F "file=@test.jpg"

# Test 2: With admin ID → Should succeed
curl -X POST http://localhost:3000/api/admin/images/upload \
  -H "X-Customer-ID: d0240c2d-5f70-4331-83ee-466908f177ca" \
  -F "file=@test.jpg"

# Test 3: Oversized file → Should fail
dd if=/dev/zero of=bigfile.jpg bs=6M count=1  # Create 6MB file
curl -X POST http://localhost:3000/api/admin/images/upload \
  -H "X-Customer-ID: d0240c2d-5f70-4331-83ee-466908f177ca" \
  -F "file=@bigfile.jpg"
```

## Summary

✅ Phase 1 (Deploy RLS) — Blocks unauthenticated uploads  
✅ Phase 2 (Backend) — Adds admin-only upload endpoint  
✅ Phase 3 (Frontend) — Uses backend instead of frontend  
✅ Phase 4 (Testing) — Verifies security  

**Total Time:** ~1 hour  
**Difficulty:** Medium  
**Risk Level:** Low (can be rolled back)

## Troubleshooting

**Q: "Permission denied" when uploading via backend**  
A: Verify SUPABASE_SERVICE_ROLE_KEY is in .env.local and RLS policies are deployed

**Q: Frontend still tries to upload to Supabase**  
A: Verify useImageUpload.ts was updated to use backend endpoint

**Q: Cannot access images after RLS deployment**  
A: Verify "Public Read" policy was created and bucket is set to public

**Q: 401 Unauthorized errors**  
A: Check X-Customer-ID header matches an actual admin customer_id in database

## Rollback Plan

If issues occur:

1. **Remove RLS Policies:**
   - Supabase Dashboard → Storage → product-images → Policies
   - Delete the 4 policies created

2. **Revert Frontend:**
   - Restore previous `useImageUpload.ts` from git

3. **Restart Backend:**
   - Kill dev server and restart

Then troubleshoot and try again.
