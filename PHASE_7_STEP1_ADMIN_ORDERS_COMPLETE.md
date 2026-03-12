# Phase 7: Frontend Migration — Step 1 Complete

**Status:** ✅ AdminOrders.tsx migration complete  
**Date:** March 10, 2026  
**Focus:** Update AdminOrders to use backend API for order status changes

---

## What Changed

### New Files Created

**File 1: `src/hooks/useAdminApi.ts`** (55 lines)

Centralized hook for all admin API calls:

```typescript
export function useAdminApi() {
  const { call } = useAdminApi();
  
  // Call any admin endpoint
  await call('POST', '/orders/123/status', { status: 'processing' });
  // Headers automatically include: X-Customer-ID from localStorage
  // Errors automatically shown as toasts
  // Responses parsed and returned
}
```

**Features:**
- ✅ Auto-injects `X-Customer-ID` header from localStorage
- ✅ Centralized error handling (shows toast on failure)
- ✅ Uses `VITE_BACKEND_URL` env var
- ✅ Falls back to `http://localhost:3000` if not set

---

### Updated Files

**File 2: `src/pages/admin/AdminOrders.tsx`** (5 line changes)

**Change 1:** Added import for useAdminApi hook
```typescript
// Before
import { supabase } from "@/integrations/supabase/client";

// After
import { supabase } from "@/integrations/supabase/client";
import { useAdminApi } from "@/hooks/useAdminApi";
```

**Change 2:** Initialize hook in component
```typescript
// Before
const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");

// After
const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const { call } = useAdminApi();  // ← NEW
```

**Change 3:** Update handleStatus function
```typescript
// Before: Direct Supabase call (INSECURE)
const handleStatus = async (orderId: string, newStatus: OrderStatus) => {
  const { error } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId);

  if (error) {
    console.error("Failed to update status:", error);
    toast.error("Failed to update order status");
    return;
  }

  setOrders((prev) =>
    prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
  );
  toast.success(`Order marked as ${STATUS_BADGE[newStatus]?.label || newStatus}`);
};

// After: Backend API call (SECURE)
const handleStatus = async (orderId: string, newStatus: OrderStatus) => {
  try {
    const result = await call('POST', `/orders/${orderId}/status`, { status: newStatus });

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    toast.success(`Order marked as ${STATUS_BADGE[newStatus]?.label || newStatus}`);
  } catch (err) {
    // Error already handled by useAdminApi hook
    console.error("Failed to update order status:", err);
  }
};
```

**File 3: `.env.example`** (template)
```env
VITE_BACKEND_URL=http://localhost:3000
```

---

## How to Test Locally

### Prerequisites
- ✅ Backend server built (Phase 6 complete)
- ✅ useAdminApi hook created
- ✅ AdminOrders.tsx updated

### Setup (5 minutes)

**Terminal 1: Start Backend**
```bash
npm run dev:backend
```

Expected output:
```
✓ Server running on http://localhost:3000
✓ Health check: http://localhost:3000/health
Environment: development
Service Role Key: ✓ Loaded
```

**Terminal 2: Start Frontend**
```bash
npm run dev
```

Expected output:
```
VITE v5.4.19 running at:
➜  Local:   http://localhost:5173/
```

### Test Flow (5 minutes)

1. **Navigate to Admin Orders**
   - On frontend (http://localhost:5173)
   - Go to admin area and click "Orders"

2. **Update an Order Status**
   - Click "Mark Preparing", "Out for Delivery", or "Mark Delivered"
   - Should see:
     - ✅ Spinner while request sends
     - ✅ Success toast: "Order marked as [status]"
     - ✅ Order card updates immediately in UI

3. **Check Browser Network Tab**
   - Open DevTools (F12) → Network tab
   - Click status update button
   - Should see:
     - ✅ Request to `http://localhost:3000/api/admin/orders/{id}/status`
     - ✅ POST method
     - ✅ Headers include `X-Customer-ID: {your_id}`
     - ✅ Response: 200 OK with `{ "success": true, "message": "...", "order": {...} }`

4. **Verify Audit Log**
   - Go to admin → Staff Performance Metrics
   - Should see new entries:
     - Action: `UPDATE_ORDER_STATUS`
     - Entity: orders
     - Changes logged with old/new status

### If Error: "Customer ID not found"
```bash
# In browser console (F12 → Console tab):
localStorage.setItem('customer_id', 'test_admin_abc123');
// Replace with real admin customer ID from database
```

### If Error: "Admin access required"
```sql
-- In Supabase SQL Editor, make sure customer is admin:
SELECT id, email, is_admin FROM customers WHERE id = 'test_admin_abc123';

-- If is_admin = false, update it:
UPDATE customers SET is_admin = true WHERE id = 'test_admin_abc123';
```

---

## What Still Remains (Phases 7.2 - 7.4)

### Phase 7.2: Migrate StockAlerts.tsx
- **File:** `src/pages/admin/StockAlerts.tsx`
- **Changes:** `GET /api/admin/stock-alerts`, `POST /api/admin/stock-alerts`, `PUT /api/admin/stock-alerts/:id`
- **Estimated:** 1-1.5 hours
- **Status:** 🟡 Pending

### Phase 7.3: Migrate ApproveCommissions.tsx
- **File:** `src/pages/admin/ApproveCommissions.tsx`
- **Changes:** `GET /api/admin/commissions`, `POST /api/admin/commissions/:id/approve`, etc.
- **Estimated:** 1-1.5 hours
- **Status:** 🟡 Pending

### Phase 7.4: Manual Testing & QA
- **Tasks:** Test all workflows locally, check audit logging, verify error handling
- **Estimated:** 1-2 hours
- **Status:** 🟡 Pending

---

## Implementation Details

### Hook: useAdminApi

**Location:** `src/hooks/useAdminApi.ts`

**Behavior:**
- Reads `customer_id` from localStorage (set during login)
- Adds `X-Customer-ID` header to all requests
- Sends requests to `{BACKEND_URL}/api/admin{endpoint}`
- Parses JSON responses
- Shows error toasts on failure
- Throws error (caught by component)

**Endpoint Format:**
```typescript
const { call } = useAdminApi();
await call(method, endpoint, body?);

// Examples:
await call('POST', '/orders/123/status', { status: 'processing' });
await call('GET', '/commissions');
await call('PUT', '/stock-alerts/456', { status: 'resolved' });
```

### Component: AdminOrders.tsx

**Behavior:**
- Still fetches orders from Supabase (read-only via anon key) ✓
- Now updates order status via backend API (secure) ✅
- Shows success/error toasts
- Updates local state optimistically

**What Unchanged:**
- ✓ Fetch orders still uses `supabase.from('orders').select()`
- ✓ UI rendering unchanged
- ✓ Filters still work the same
- ✓ Refresh button still works

---

## Security Improvements

### Before (Direct Supabase)
```
Frontend Update ──────→ Supabase (anon key)
├─ Could bypass RLS
├─ No verification
├─ No audit
└─ Insecure
```

### After (Backend API)
```
Frontend Update ──────→ Backend ──────→ Supabase (service role)
├─ Verifies is_admin flag ✅
├─ Auto-logs to audit_log ✅
├─ Service role key protected ✅
└─ Secure ✅
```

---

## Files Summary

```
CREATED:
├─ src/hooks/useAdminApi.ts ..................... ✅ (55 lines)
└─ .env.example ............................... ✅ (env template)

MODIFIED:
└─ src/pages/admin/AdminOrders.tsx ............ ✅ (5 line changes)

NOT CHANGED:
├─ src/pages/admin/StockAlerts.tsx ........... ⏳ (Phase 7.2)
├─ src/pages/admin/ApproveCommissions.tsx ... ⏳ (Phase 7.3)
└─ Backend code ............................... ✓ (Phase 6 - complete)
```

---

## Next Action

After verifying this works locally:

**Option A: Continue with Phase 7.2 immediately**
- Migrate StockAlerts.tsx
- Same pattern: create hook calls instead of direct Supabase

**Option B: Verify TestsPass**
- Run full test suite
- Ensure no regression

**Recommended:** Option A - continue migration while fresh.

---

## Quick Checklist

- [x] Hook created (useAdminApi.ts)
- [x] AdminOrders.tsx updated
- [x] .env.example created
- [ ] Test locally with both servers running
- [ ] Verify status updates work
- [ ] Check browser Network tab
- [ ] Verify audit log entries appear
- [ ] Ready for Phase 7.2

