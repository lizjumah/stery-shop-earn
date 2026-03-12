# Frontend Migration Checklist - Admin API Integration

This document lists all frontend files that need updates to call the backend admin API instead of direct Supabase.

**Legend:**
- ✅ Complete/No changes needed
- 🟡 Needs migration
- ⏳ Optional/Phase 2

---

## Quick Demo: Before & After

### Before (Direct Supabase - INSECURE)
```typescript
// OLD: Calls Supabase directly - anon key can bypass RLS
const { error } = await supabase
  .from('orders')
  .update({ status: 'preparing' })
  .eq('id', orderId);
```

### After (Backend API - SECURE)
```typescript
// NEW: Calls backend with admin verification
const response = await fetch(`${BACKEND_URL}/api/admin/orders/${orderId}/status`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Customer-ID': localStorage.getItem('customer_id') || '',
  },
  body: JSON.stringify({ status: 'preparing' })
});
```

---

## Files Requiring Migration

### 1. 🟡 src/pages/admin/AdminOrders.tsx

**Purpose:** Display all orders, update status

**Current Implementation:** Direct Supabase queries

**Changes Needed:**

```typescript
// ADD at top of file:
const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:3000';
const customerId = localStorage.getItem('customer_id') || '';

// REPLACE: All order.status updates
// FROM:
await supabase.from('orders').update({ status }).eq('id', orderId);

// TO:
const response = await fetch(`${BACKEND_URL}/api/admin/orders/${orderId}/status`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Customer-ID': customerId,
  },
  body: JSON.stringify({ status })
});

if (!response.ok) {
  const error = await response.json();
  throw new Error(error.message);
}

const data = await response.json();
// data.order contains updated order object
```

**Functions to Update:**
- `handleUpdateOrderStatus()`
- `updateOrderStatusBatch()`
- Any direct calls to `supabase.from('orders').update()`

**Endpoints Used:**
- `POST /api/admin/orders/:id/status`

**Affected UI Elements:**
- Order status dropdown/selector
- Status update buttons
- Bulk status update feature (if exists)

**Testing After:** Verify order status updates appear in audit_log

---

### 2. 🟡 src/pages/admin/OrderOperations.tsx (if exists)

**Purpose:** Advanced order operations (POS integration, fulfillment)

**Current Implementation:** Direct Supabase queries

**Changes Needed:**

```typescript
// UPDATE STATUS CHANGES:
const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:3000';
const customerId = localStorage.getItem('customer_id') || '';

// REPLACE POS field updates
// FROM:
await supabase.from('orders').update({
  pos_receipt_number,
  pos_total,
  pos_payment_method,
  pos_timestamp
}).eq('id', orderId);

// TO:
const response = await fetch(`${BACKEND_URL}/api/admin/orders/${orderId}/pos`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Customer-ID': customerId,
  },
  body: JSON.stringify({
    pos_receipt_number,
    pos_total,
    pos_payment_method,
    pos_timestamp
  })
});
```

**Endpoints Used:**
- `POST /api/admin/orders/:id/pos`
- `POST /api/admin/orders/:id/status` (if status updates also)

**Affected UI Elements:**
- POS receipt number input
- POS total input
- Payment method selector

**Testing After:** Verify POS fields updated and logged to audit_log

---

### 3. 🟡 src/pages/admin/StockAlerts.tsx

**Purpose:** Manage low-stock alerts

**Current Implementation:** Likely uses `useStockAlerts` hook with direct Supabase

**Changes Needed:**

```typescript
// ADD at top:
const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:3000';
const customerId = localStorage.getItem('customer_id') || '';

// REPLACE: All stock alert queries and mutations

// LIST alerts:
const response = await fetch(`${BACKEND_URL}/api/admin/stock-alerts`, {
  method: 'GET',
  headers: { 'X-Customer-ID': customerId }
});

// CREATE alert:
const response = await fetch(`${BACKEND_URL}/api/admin/stock-alerts`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Customer-ID': customerId,
  },
  body: JSON.stringify({
    product_id,
    threshold_quantity,
    status: 'active'
  })
});

// UPDATE alert:
const response = await fetch(`${BACKEND_URL}/api/admin/stock-alerts/${alertId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'X-Customer-ID': customerId,
  },
  body: JSON.stringify({
    status: newStatus,
    threshold_quantity: newThreshold
  })
});
```

**Endpoints Used:**
- `GET /api/admin/stock-alerts`
- `POST /api/admin/stock-alerts`
- `PUT /api/admin/stock-alerts/:id`

**Affected UI Elements:**
- Stock alert list/table
- Create alert button/form
- Update alert modal/form
- Threshold value input

**Testing After:**
- Verify alerts load
- Verify new alerts created and logged
- Verify updates logged to audit_log

---

### 4. 🟡 src/pages/admin/ApproveCommissions.tsx (if exists)

**Purpose:** Commission approval workflow

**Current Implementation:** Direct Supabase updates

**Changes Needed:**

```typescript
// ADD at top:
const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:3000';
const customerId = localStorage.getItem('customer_id') || '';

// LIST commissions:
const response = await fetch(`${BACKEND_URL}/api/admin/commissions`, {
  method: 'GET',
  headers: { 'X-Customer-ID': customerId }
});

// APPROVE commission:
const response = await fetch(`${BACKEND_URL}/api/admin/commissions/${commissionId}/approve`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Customer-ID': customerId,
  },
  body: JSON.stringify({})
});

// REJECT commission:
const response = await fetch(`${BACKEND_URL}/api/admin/commissions/${commissionId}/reject`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Customer-ID': customerId,
  },
  body: JSON.stringify({
    rejection_reason: 'Reason for rejection'
  })
});

// MARK PAID:
const response = await fetch(`${BACKEND_URL}/api/admin/commissions/${commissionId}/mark-paid`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Customer-ID': customerId,
  },
  body: JSON.stringify({
    paid_date: new Date().toISOString(),
    payment_reference: 'BANK_TRF_123'
  })
});
```

**Endpoints Used:**
- `GET /api/admin/commissions`
- `POST /api/admin/commissions/:id/approve`
- `POST /api/admin/commissions/:id/reject`
- `POST /api/admin/commissions/:id/mark-paid`

**Affected UI Elements:**
- Commission table/list
- Approve button
- Reject button + reason modal
- Mark paid button
- Status badges

**Testing After:**
- Verify commission list loads with stats
- Verify approve action updates status
- Verify reject captures reason
- Verify mark paid sets paid_date
- Verify all actions logged to audit_log

---

### 5. ✅ src/pages/admin/ManageStaff.tsx

**Status:** ✅ COMPLETE - Uses hooks, no direct updates yet

**Note:** If this page reads `staff_users` table, it already works. If it has update functionality, add backend calls for consistency.

**Optional Migration:**
- Could add `POST /api/admin/staff/:id/update` endpoint for staff record updates
- Current hook-based approach is sufficient for read-only

---

### 6. ✅ src/pages/Profile.tsx (Customer Profile)

**Status:** ✅ NO CHANGES NEEDED

**Reason:** Customer-facing page, inserts/updates via anon key (checkout flow). Not admin operation.

---

### 7. ✅ src/pages/Welcome.tsx

**Status:** ✅ NO CHANGES NEEDED

**Reason:** Customer onboarding, not admin operations.

---

### 8. ✅ src/pages/shop/* (All shop pages)

**Status:** ✅ NO CHANGES NEEDED

**Reason:** Customer-facing shopping cart/checkout. Must continue using anon key for direct INSERT.

---

### 9. ⏳ src/contexts/AppContext.tsx

**Status:** ⏳ OPTIONAL - Phase 2 optimization

**Potential Enhancement:** Create admin API context wrapper to handle backend requests consistently.

**Implementation:** Future enhancement to simplify API calls across admin pages.

---

### 10. ⏳ src/hooks/useAdminApi.ts (NEW - RECOMMENDED)

**Status:** 🟡 CREATE NEW - Simplify all admin API calls

**Purpose:** Centralized hook for all backend admin calls

**Suggested Implementation:**

```typescript
// src/hooks/useAdminApi.ts
import { useCallback } from 'react';
import { useToast } from './use-toast';

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:3000';

export function useAdminApi() {
  const { toast } = useToast();
  const customerId = localStorage.getItem('customer_id') || '';

  const call = useCallback(
    async (method: string, endpoint: string, body?: any) => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/admin${endpoint}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-Customer-ID': customerId,
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'API request failed');
        }

        return await response.json();
      } catch (err) {
        console.error('Admin API Error:', err);
        toast({
          title: 'Error',
          description: (err as Error).message,
          variant: 'destructive',
        });
        throw err;
      }
    },
    [customerId, toast]
  );

  return { call };
}
```

**Usage in Components:**

```typescript
import { useAdminApi } from '@/hooks/useAdminApi';

// In component:
const { call } = useAdminApi();

// Update order status:
await call('POST', '/orders/ord_123/status', { status: 'preparing' });

// List commissions:
const { commissions } = await call('GET', '/commissions');

// Approve commission:
await call('POST', '/commissions/comm_123/approve', {});
```

**Benefits:**
- Centralized error handling
- Automatic auth header injection
- Toast notifications on errors
- Type-safe API calls (with TypeScript)

---

### 11. ✅ src/pages/admin/StaffPerformanceMetrics.tsx

**Status:** ✅ COMPLETE

**Reason:** Already fixed in Phase 4, uses read-only queries to staff_users and audit_log.

**Note:** Could be enhanced later to use audit-log API endpoint instead of direct Supabase.

---

## Migration Strategy

### Phase 1: Critical (Immediate)
1. Create `useAdminApi` hook (if not using individual patterns)
2. Fix `AdminOrders.tsx` - order status updates
3. Fix `ApproveCommissions.tsx` - commission workflow
4. Fix `StockAlerts.tsx` - stock alert management

### Phase 2: Enhancement (Week 2)
1. Create `OrderOperations.tsx` if needed
2. Add additional admin endpoints
3. Implement audit log dashboard

### Phase 3: Advanced (Week 3+)
1. Add staff management endpoints
2. Add performance metrics
3. Add real-time notifications

---

## Testing Checklist

For each file updated, verify:

- [ ] Component loads without errors
- [ ] API calls include `X-Customer-ID` header
- [ ] Responses handled correctly
- [ ] Error messages displayed to user
- [ ] Actions appear in audit_log (check StaffPerformanceMetrics)
- [ ] No direct Supabase updates in admin pages
- [ ] Loading states work while API responds
- [ ] HTTP errors caught and displayed

---

## Frontend Environment Setup

### 1. Create `.env` file (if not exists):

```
VITE_BACKEND_URL=http://localhost:3000
```

### 2. Update admin component imports:

```typescript
const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:3000';
```

### 3. Run frontend dev server:

```bash
npm run dev
# Frontend on http://localhost:5173
# Backend on http://localhost:3000
```

### 4. Test API connectivity:

```bash
# In browser console:
fetch('http://localhost:3000/health')
  .then(r => r.json())
  .then(console.log)
```

---

## Common Mistakes to Avoid

❌ **Don't:** Leave direct Supabase `update()` calls in admin pages
```typescript
// WRONG - insecure
await supabase.from('orders').update(...).eq('id', id);
```

✅ **Do:** Use backend API endpoints instead
```typescript
// RIGHT - secure
await fetch(`${BACKEND_URL}/api/admin/orders/${id}/status`, {...})
```

---

❌ **Don't:** Forget the `X-Customer-ID` header
```typescript
// WRONG - backend won't know who's calling
const response = await fetch(endpoint);
```

✅ **Do:** Include customer ID for admin verification
```typescript
// RIGHT - auth header included
const response = await fetch(endpoint, {
  headers: { 'X-Customer-ID': customerId }
});
```

---

❌ **Don't:** Hardcode backend URL in components
```typescript
// WRONG - hardcoded
const url = 'http://localhost:3000/api/admin/...';
```

✅ **Do:** Use environment variable
```typescript
// RIGHT - works everywhere
const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:3000';
```

---

## FAQ

**Q: Can I still use Supabase directly for other operations?**
A: Yes! Checkout (anon key) continues using direct Supabase. Only admin operations use backend.

**Q: What if backend is offline?**
A: Fetch will fail. Add error handling and show user-friendly error message.

**Q: How do I handle loading states?**
A: Use React state or TanStack Query for better async handling.

**Q: Can frontend call backend in production?**
A: Yes! Deploy backend to same server or separate backend domain. Update `VITE_BACKEND_URL` in production `.env`.

**Q: Are audit logs automatic?**
A: Yes! Backend auto-logs all admin actions. Just verify they appear in StaffPerformanceMetrics.

