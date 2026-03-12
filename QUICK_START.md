# Quick Start - Staging Deployment (TL;DR)

## 5-Minute Setup

### Terminal 1: Start Backend
```bash
# Install deps if needed
npm install express cors dotenv @types/express @types/node ts-node

# Copy admin.ts from SERVER_API_GUIDE.md to src/api/admin.ts

# Create src/server/index.ts (copy from STAGING_DEPLOYMENT_CHECKLIST.md Step 1.3)

# Set .env.local:
SUPABASE_URL=https://iiyzyguilixigsbumqmz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<paste-your-service-role-key>

# Run
npm run server
# Output: Server running on http://localhost:3000
```

### Terminal 2: Run Frontend (Already works)
```bash
npm run dev
# Existing checkout/dashboard continue to work
```

### Browser: Run Migrations
1. Supabase Dashboard → SQL Editor
2. Copy-paste and run: `supabase/migrations/20260310004b_orders_enhancement.sql`
3. Copy-paste and run: `supabase/migrations/20260310004c_audit_log.sql`
4. Copy-paste and run: `supabase/migrations/20260310005_enhancements.sql`

### Code Editor: Update AdminOrders.tsx
Replace the `handleStatus` function (see STAGING_DEPLOYMENT_CHECKLIST.md Step 4.1)

---

## 3 Quick Tests

### Test 1: Checkout Works
```bash
# Terminal 3
curl -X POST "https://iiyzyguilixigsbumqmz.supabase.co/rest/v1/orders" \
  -H "apikey: eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"test-id","order_number":"TEST-001","customer_phone":"+254712345678","customer_name":"Test","items":[],"subtotal":0,"total":0,"payment_method":"cash","delivery_option":"delivery","status":"received"}'
# Expected: 201 Created ✓
```

### Test 2: Admin Table Blocked
```bash
curl -X GET "https://iiyzyguilixigsbumqmz.supabase.co/rest/v1/stock_alerts" \
  -H "apikey: eyJhbGc..."
# Expected: 403 Unauthorized ✓
```

### Test 3: Backend API Works
```bash
curl -X POST "http://localhost:3000/api/admin/orders/any-order-id/status" \
  -H "Content-Type: application/json" \
  -d '{"adminId":"admin-customer-uuid","orderId":"any-order-id","newStatus":"confirmed"}'
# Expected: 200 OK with order data ✓
```

---

## Files Involved

| File | Status | Action |
|------|--------|--------|
| `src/api/admin.ts` | NEW | Copy from SERVER_API_GUIDE.md |
| `src/server/index.ts` | NEW | Copy from STAGING_DEPLOYMENT_CHECKLIST.md |
| `src/pages/admin/AdminOrders.tsx` | MODIFY | Update handleStatus function |
| `.env.local` | NEW | Add SUPABASE_SERVICE_ROLE_KEY |
| `supabase/migrations/004b*` | DEPLOY | Run in Supabase SQL Editor |
| `supabase/migrations/004c*` | DEPLOY | Run in Supabase SQL Editor |
| `supabase/migrations/005*` | DEPLOY | Run in Supabase SQL Editor |

---

## Success Indicators

✓ Backend starts: `npm run server` shows "Server running on http://localhost:3000"  
✓ Frontend works: Checkout page loads and can place orders  
✓ Admin API works: Can call `http://localhost:3000/api/admin/*` endpoints  
✓ Security works: Direct calls to `stock_alerts` return 403 Forbidden  
✓ Audit log works: Check `audit_log` table has entries after admin actions  

---

## If Something Breaks

| Error | Fix |
|-------|-----|
| "Cannot find module 'express'" | `npm install express cors dotenv` |
| "EADDRINUSE 3000" | Backend already running, kill it or use different port |
| "Service role key error" | Check `.env.local` file exists and key is correct |
| "Admin tables not blocked" | Migrations didn't deploy, re-run in Supabase SQL Editor |
| "handleStatus not working" | Make sure AdminOrders.tsx was updated correctly |

---

## Full Docs

See:
- `SERVER_API_GUIDE.md` - Complete backend code + examples
- `STAGING_DEPLOYMENT_CHECKLIST.md` - Step-by-step detailed guide  
- `PRODUCTION_MIGRATION_PLAN.md` - Timeline & strategy

**Ready? Start with Terminal 1 above. Should take ~15 minutes.**
