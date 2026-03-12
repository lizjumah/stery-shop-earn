# Staging Deployment Checklist - Step by Step

## PHASE 1: Backend Setup (Local Development)

### Step 1.1: Create backend project structure
```bash
# In your project root (already in c:\Users\user\Desktop\VC CODE APP\stery-shop-earn)
mkdir -p src/server
mkdir -p src/api
```

### Step 1.2: Install backend dependencies
```bash
# Add to package.json dependencies:
npm install express cors dotenv

# Add to package.json devDependencies:
npm install -D @types/express @types/node ts-node typescript
```

### Step 1.3: Create backend server file
**File: `src/server/index.ts`**
```typescript
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import adminRouter from "../api/admin";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Admin API routes
app.use("/api/admin", adminRouter);

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
```

### Step 1.4: Create admin API router
**File: `src/api/admin.ts`**

Copy the complete code from SERVER_API_GUIDE.md (lines from "import express" through "export default router")

### Step 1.5: Add npm scripts
**In package.json:**
```json
{
  "scripts": {
    "dev": "vite",
    "server": "ts-node src/server/index.ts",
    "server:dev": "nodemon --exec ts-node src/server/index.ts",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

### Step 1.6: Test backend startup
```bash
npm install
npm run server
# Expected output:
# Server running on http://localhost:3000
# Health check: http://localhost:3000/health
```

**✓ Backend running locally**

---

## PHASE 2: Environment Variables Setup

### Step 2.1: Create .env.local (backend only)
**File: `.env.local`** (Create new, or add to existing)
```bash
# SUPABASE - Backend Only (NEVER expose to frontend)
SUPABASE_URL="https://iiyzyguilixigsbumqmz.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY_HERE"

# Server
PORT=3000
NODE_ENV=development
```

### Step 2.2: Get Service Role Key
1. Go to: https://supabase.com/dashboard/project/iiyzyguilixigsbumqmz
2. Click: Settings → API → Service Role Key
3. Copy the long key starting with `eyJ...`
4. Paste into `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`

### Step 2.3: Verify .env.local is in .gitignore
**In `.gitignore`:**
```
.env.local
.env.*.local
```

**✓ Backend environment configured**

---

## PHASE 3: Supabase Staging Migrations

### Step 3.1: Backup staging database
```bash
# In Supabase dashboard
# Settings → Backups → Create Backup (optional but recommended)
```

### Step 3.2: Deploy Migration 20260310004b
1. Go to: Supabase Dashboard → SQL Editor
2. Click: "+ New Query"
3. Copy entire contents of `supabase/migrations/20260310004b_orders_enhancement.sql`
4. Paste into SQL Editor
5. Click: "Run"
6. Wait for "Success" notification

**Verify:**
```sql
-- In SQL Editor, run:
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('pos_receipt_number', 'pos_total', 'pos_processed_at', 'staff_notes', 'assigned_to', 'created_by', 'updated_by')
ORDER BY ordinal_position;
-- Expected: 7 rows returned
```

### Step 3.3: Deploy Migration 20260310004c
1. Click: "+ New Query"
2. Copy entire contents of `supabase/migrations/20260310004c_audit_log.sql`
3. Paste into SQL Editor
4. Click: "Run"
5. Wait for "Success"

**Verify:**
```sql
-- In SQL Editor, run:
SELECT tablename FROM pg_tables WHERE tablename = 'audit_log';
-- Expected: 1 row (audit_log)
```

### Step 3.4: Deploy Migration 20260310005
1. Click: "+ New Query"
2. Copy entire contents of `supabase/migrations/20260310005_enhancements.sql`
3. Paste into SQL Editor
4. Click: "Run"
5. Wait for "Success"

**Verify:**
```sql
-- In SQL Editor, run:
SELECT tablename FROM pg_tables 
WHERE tablename IN ('stock_alerts', 'commission_approvals');
-- Expected: 2 rows
```

**✓ Staging migrations deployed**

---

## PHASE 4: Frontend Admin Changes

### Step 4.1: Update AdminOrders.tsx
**File: `src/pages/admin/AdminOrders.tsx`**

Find this section (around line 50-60):
```tsx
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
};
```

Replace with:
```tsx
const handleStatus = async (orderId: string, newStatus: OrderStatus) => {
  try {
    const response = await fetch("/api/admin/orders/" + orderId + "/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminId: customer?.id,
        orderId,
        newStatus,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      toast.error(error.error || "Failed to update order status");
      return;
    }

    const { order } = await response.json();
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...order } : o))
    );
    toast.success(`Order updated to ${newStatus}`);
  } catch (err) {
    console.error("Status update error:", err);
    toast.error("Failed to update order status");
  }
};
```

### Step 4.2: Update order fetch to read from Supabase (unchanged)
The `fetchOrders` function can stay as-is (reads via anon key):
```tsx
const fetchOrders = async () => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  // This continues to work (anon key SELECT still allowed)
};
```

**✓ AdminOrders.tsx updated**

---

## PHASE 5: Testing - Staging Validation

### Test 5.1: Backend Health Check
```bash
# Terminal 1: Run backend
npm run server

# Terminal 2: Test health endpoint
curl http://localhost:3000/health
# Expected response:
# {"status":"ok","timestamp":"2026-03-10T..."}
```

✓ Backend responds

### Test 5.2: Verify RLS - Checkout Still Works
```bash
# Test 1: Anon key can INSERT orders (checkout)
curl -X POST "https://iiyzyguilixigsbumqmz.supabase.co/rest/v1/orders" \
  -H "apikey: eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "test-customer-uuid",
    "customer_phone": "+254712345678",
    "customer_name": "Test Customer",
    "order_number": "TEST-001",
    "items": [{"productId":"1","name":"Bread","quantity":1,"price":50}],
    "subtotal": 50,
    "total": 50,
    "payment_method": "cash",
    "delivery_option": "delivery",
    "status": "received"
  }'
# Expected: Status 201 Created ✓
```

✓ Checkout works

### Test 5.3: Verify RLS - Admin Tables Blocked
```bash
# Test 2: Anon key CANNOT access stock_alerts
curl -X GET "https://iiyzyguilixigsbumqmz.supabase.co/rest/v1/stock_alerts" \
  -H "apikey: eyJhbGc..."
# Expected: Status 403 Unauthorized ({"code":"PGRST301","message":"..."}}) ✓
```

✓ Admin table blocked

### Test 5.4: Backend API - Update Order Status
1. Open terminal, run backend: `npm run server`
2. In REST client or browser console, test:

```typescript
// Get a real admin customer ID first
const adminResponse = await fetch("https://iiyzyguilixigsbumqmz.supabase.co/rest/v1/customers?is_admin=eq.true&limit=1", {
  headers: { apikey: "eyJhbGc..." }
});
const admin = (await adminResponse.json())[0];
const adminId = admin.id;

// Get a real order ID
const orderResponse = await fetch("https://iiyzyguilixigsbumqmz.supabase.co/rest/v1/orders?limit=1", {
  headers: { apikey: "eyJhbGc..." }
});
const order = (await orderResponse.json())[0];
const orderId = order.id;

// Test backend API
const response = await fetch("http://localhost:3000/api/admin/orders/" + orderId + "/status", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    adminId: adminId,
    orderId: orderId,
    newStatus: "confirmed"
  })
});

console.log(await response.json());
// Expected: { "success": true, "order": {...}, "message": "..." } ✓
```

**If error:** Check `.env.local` has `SUPABASE_SERVICE_ROLE_KEY`

✓ Backend API works

### Test 5.5: Verify Audit Log Auto-Write
```sql
-- In Supabase SQL Editor, check if log entry was created:
SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 1;
-- Expected: 1 row with staff_id, action='update_status', entity_type='orders' ✓
```

✓ Audit logging works

### Test 5.6: Frontend Admin Page Test
1. In browser, navigate to admin dashboard
2. Make sure you're logged in as admin (`customer.is_admin = true`)
3. Find an order in the list
4. Click "Update Status" button
5. Change status to different value
6. Check:
   - ✓ No console errors
   - ✓ Toast shows "Order updated to [status]"
   - ✓ Order status changed in table
   - ✓ Audit log has new entry

**If fails:** Check console for errors, verify backend is running

✓ Frontend admin works

### Test 5.7: Non-Admin Cannot Access Backend
```bash
# Get a non-admin customer ID
curl -X GET "https://iiyzyguilixigsbumqmz.supabase.co/rest/v1/customers?is_admin=eq.false&limit=1" \
  -H "apikey: eyJhbGc..."

# Try to use backend API with non-admin ID
curl -X POST "http://localhost:3000/api/admin/orders/test-id/status" \
  -H "Content-Type: application/json" \
  -d '{"adminId":"non-admin-uuid","newStatus":"confirmed"}'
# Expected: Status 403 { "error": "Not authorized as admin" } ✓
```

✓ Authorization works

---

## PHASE 6: Sign-Off - Ready for Production

### Checklist
- [ ] Backend runs locally without errors
- [ ] Environment variables set (.env.local)
- [ ] All 3 migrations deployed to staging
- [ ] Checkout flow still works (orders can be placed)
- [ ] Admin tables blocked from anon key (403)
- [ ] Backend API successfully updates orders
- [ ] Audit log records admin actions
- [ ] Frontend admin pages call `/api/admin/*`
- [ ] Non-admins cannot use backend API
- [ ] No console errors in admin dashboard

---

## Production Deployment (When Ready)

### Prod Step 1: Deploy Backend to Hosting
```bash
# Option A: Vercel
npm install -g vercel
vercel

# Option B: Railway
npm install -g railway
railway up

# Option C: Heroku
npm install -g heroku
heroku create
git push heroku main
```

### Prod Step 2: Set Production Environment Variables
In your hosting provider's dashboard:
```
SUPABASE_URL=https://iiyzyguilixigsbumqmz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-key>
NODE_ENV=production
```

### Prod Step 3: Update Frontend API URLs
**In `src/api/admin.ts` or wherever backend calls are made:**

Replace `http://localhost:3000` with production backend URL:
```typescript
// Before (staging):
const API_BASE = "http://localhost:3000";

// After (production):
const API_BASE = process.env.VITE_BACKEND_URL || "http://localhost:3000";
```

Add to frontend `.env.production`:
```
VITE_BACKEND_URL=https://your-production-backend.com
```

### Prod Step 4: Deploy Migrations to Production Supabase
Same process as staging - deploy 004b, 004c, 005 migrations

### Prod Step 5: Deploy Frontend
```bash
npm run build
# Deploy dist/ folder to hosting
```

---

## Troubleshooting

### Issue: "Cannot find module 'admin'"
**Fix:** Make sure `src/api/admin.ts` exists and is properly exported

### Issue: Backend won't start
**Fix:** Check `npm run server` output for errors, ensure Node.js 16+ installed

### Issue: CORS errors
**Fix:** Backend has `app.use(cors())` - should be fine, check frontend URL matches

### Issue: "Not authorized as admin"
**Fix:** Make sure customer being used has `is_admin = true` in Supabase

### Issue: Anon key returns 403 for stock_alerts
**Fix:** This is CORRECT - staging RLS is working as intended

### Issue: Audit log empty
**Fix:** Make sure backend is running and you called it via `/api/admin/*`

---

## Quick Reference

| What | Where | Why |
|-----|-------|-----|
| Backend code | `src/api/admin.ts` | API endpoints |
| Backend config | `.env.local` | Service role key |
| Migrations | `supabase/migrations/` | DB schema |
| Admin frontend | `src/pages/admin/` | Updated to use `/api/admin/*` |
| Test endpoint | `http://localhost:3000/health` | Verify running |

**Ready to go! See issues? Check Troubleshooting section above.**
