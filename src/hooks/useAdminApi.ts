import { useCallback } from 'react';
import { useToast } from './use-toast';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

/**
 * Hook for calling admin backend API endpoints
 * 
 * Usage:
 * const { call } = useAdminApi();
 * await call('POST', '/orders/123/status', { status: 'preparing' });
 * 
 * The X-Customer-ID header is automatically injected from localStorage
 */
export function useAdminApi() {
  const { toast } = useToast();

  const call = useCallback(
    async (method: string, endpoint: string, body?: any) => {
      try {
        const customerId = localStorage.getItem('stery_customer_id');

        if (!customerId) {
          throw new Error('Customer ID not found. Please log in.');
        }

        const response = await fetch(`${BACKEND_URL}/api/admin${endpoint}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-Customer-ID': customerId,
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.message || `API error: ${response.status}`;
          throw new Error(errorMessage);
        }

        return await response.json();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[Admin API Error]', message);
        
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });

        throw err;
      }
    },
    [toast]
  );

  return { call };
}
