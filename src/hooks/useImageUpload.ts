import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { API_BASE } from '@/lib/api/client';

interface UseImageUploadReturn {
  uploading: boolean;
  uploadImage: (file: File) => Promise<string | null>;
}

/**
 * Hook for uploading images via backend API
 * Backend handles:
 * - Admin verification (X-Customer-ID header)
 * - File type validation
 * - File size validation (5MB limit)
 * - Supabase Storage upload using service_role key
 * Returns the public URL of the uploaded image
 */
export function useImageUpload(): UseImageUploadReturn {
  const [uploading, setUploading] = useState(false);

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    try {
      // Validate file type on client side (backend validates too)
      if (!file) {
        toast.error('No file selected');
        return null;
      }

      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a valid image (JPEG, PNG, WebP, or GIF)');
        return null;
      }

      // Check file size on client side (backend validates too)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast.error('Image size must be less than 5MB');
        return null;
      }

      setUploading(true);

      // Get admin ID from localStorage (set during login)
      const customerId = localStorage.getItem('stery_customer_id');
      if (!customerId) {
        toast.error('Not authenticated — please log in first');
        return null;
      }

      // Prepare form data for multipart upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload via backend endpoint
      const response = await fetch(`${API_BASE}/api/admin/images/upload`, {
        method: 'POST',
        headers: {
          'X-Customer-ID': customerId,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = error.message || error.error || 'Upload failed';
        toast.error(`Upload failed: ${errorMessage}`);
        return null;
      }

      const data = await response.json();

      if (!data.success || !data.url) {
        toast.error('Failed to get image URL from server');
        return null;
      }

      toast.success('Image uploaded successfully');
      return data.url;
    } catch (err) {
      console.error('Image upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload image';
      toast.error(errorMessage);
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
