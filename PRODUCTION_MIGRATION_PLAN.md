# Production-Safe Migration Summary & Implementation Plan

## Current State: Staging vs Production

### Staging (Current Option A)
- ❌ All RLS policies use `USING (true)` (open to all)
- ❌ Frontend can directly query admin tables via anon key
- ❌ No database-level security enforcement
- ✅ Good for local development + staging testing
- **Location**: Currently deployed migrations

### Production (NEW)
- ✅ RLS policies use `auth.role() = 'service_role'` (server-only)
- ✅ Frontend anon key blocked from admin tables (403 Forbidden)
- ✅ Backend API validates admin, then uses service_role key
- ✅ Enterprise-grade security without staff authentication rebuild
- **Location**: Updated migrations (ready to deploy)

---

## What Changed in Migrations

### Migration 20260310004b_orders_enhancement.sql

**STAGING VERSION:**
```sql
CREATE POLICY "Update limited to admins (app-enforced)"
  ON public.orders FOR UPDATE 
  USING (true)
  WITH CHECK (true);
```
❌ RLS allows everyone to update

**PRODUCTION VERSION:**
```sql
CREATE POLICY "Only backend can update orders"
  ON public.orders FOR UPDATE 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```
✅ RLS blocks anon key, allows backend only
✅ Frontend can still INSERT (checkout unchanged)
✅ Frontend can still SELECT (dashboard unchanged)

---

### Migration 20260310004c_audit_log.sql

**STAGING VERSION:**
```sql
CREATE POLICY "Admins can read audit logs"
  ON public.audit_log FOR SELECT USING (true);
CREATE POLICY "Insert audit logs (system/triggers only)"
  ON public.audit_log FOR INSERT WITH CHECK (true);
```
❌ Anyone can INSERT and READ logs

**PRODUCTION VERSION:**
```sql
CREATE POLICY "Admin logs read by backend only"
  ON public.audit_log FOR SELECT 
  USING (auth.role() = 'service_role');
CREATE POLICY "Admin logs written by backend only"
  ON public.audit_log FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Audit logs are immutable - no updates"
  ON public.audit_log FOR UPDATE USING (false);
```
✅ Only backend can write logs (auto-populated by backend on admin actions)
✅ Only backend can read logs (for dashboards/reports)
✅ Audit logs are immutable (prevent tampering)

---

### Migration 20260310005_enhancements.sql

**STAGING VERSION:**
```sql
CREATE POLICY "Public read/write stock alerts"
  ON public.stock_alerts FOR SELECT USING (true);
CREATE POLICY "Public insert stock alerts"
  ON public.stock_alerts FOR INSERT WITH CHECK (true);
-- ... similar for commission_approvals
```
❌ Anyone can read/write admin tables

**PRODUCTION VERSION:**
```sql
CREATE POLICY "Stock alerts - service_role only (backend)"
  ON public.stock_alerts FOR SELECT 
  USING (auth.role() = 'service_role');
CREATE POLICY "Stock alerts - insert service_role only"
  ON public.stock_alerts FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
-- ... similar for all admin operations
```
✅ Only backend can access these tables
✅ Frontend calls `/api/admin/*` endpoints instead

---

## Implementation Steps

### Phase 1: Backend Setup (Day 1)
1. Create backend server (Express.js, using provided code)
2. Add `SUPABASE_SERVICE_ROLE_KEY` to backend `.env`
3. Deploy backend server (Vercel, Railway, Heroku, etc.)
4. Test: Backend can call Supabase with service_role key

### Phase 2: Deploy Production Migrations (Day 2)
1. Backup production database
2. Deploy migration 20260310004b (orders UPDATE security)
3. Deploy migration 20260310004c (audit_log security)
4. Deploy migration 20260310005 (admin tables security)
5. Verify: Direct frontend API calls to admin tables fail (403)

### Phase 3: Update Frontend Admin Pages (Day 2-3)
1. Update AdminOrders.tsx to call `/api/admin/orders/:id/status`
2. Update AdminStockAlerts.tsx to call `/api/admin/stock-alerts`
3. Update AdminCommissions.tsx to call `/api/admin/commissions`
4. Remove all direct Supabase calls from admin pages
5. Test: Admin pages work via backend API

### Phase 4: Testing & Verification (Day 3)
1. Test: Checkout still works (anon key INSERT)
2. Test: Order history still works (anon key SELECT)
3. Test: Admin pages work (backend API)
4. Test: Direct API attacks fail (403 Forbidden)
5. Test: Audit log records all admin actions
6. Load test: Backend can handle concurrent admin requests

---

## Risk Assessment & Mitigation

| Risk | Severity | Impact | Mitigation |
|:---:|:---:|---|---|
| Checkout breaks | CRITICAL | Orders can't be created | Kept INSERT policy open for all; tested before deploy |
| Admin can't access pages | HIGH | Admins blocked from dashboard | Backend verified for admin status before operations |
| Audit log slows down operations | MEDIUM | Performance degradation | Async audit logging, indexed by created_at DESC |
| Backend API key compromised | CRITICAL | Attacker can modify all data | Store in backend env only, never expose to frontend |
| Backend server down | MEDIUM | Admin operations fail | API should return 503, frontend shows error |

---

## Rollback Plan

If issues occur, rollback is simple:

```bash
# 1. Keep staging migrations in Git
git log --oneline src/migrations/

# 2. Restore RLS policies to permissive:
ALTER POLICY "..." ON stock_alerts 
  USING (true) WITH CHECK (true);

# 3. Frontend continues to work directly with Supabase
# 4. Admin pages revert to direct Supabase calls
```

**Time to rollback: ~15 minutes**

---

## Files to Deploy

### Migrations (to Supabase)
```
✓ supabase/migrations/20260310004b_orders_enhancement.sql (UPDATED)
✓ supabase/migrations/20260310004c_audit_log.sql (UPDATED)
✓ supabase/migrations/20260310005_enhancements.sql (UPDATED)
```

### Backend (new files)
```
✓ src/api/admin.ts (NEW - provided in SERVER_API_GUIDE.md)
✓ src/server.ts or main.ts (Updated to include admin router)
```

### Frontend (updated)
```
✓ src/pages/admin/AdminOrders.tsx (MODIFIED - use backend API)
✓ src/pages/admin/AdminStockAlerts.tsx (MODIFIED - use backend API)
✓ src/pages/admin/AdminCommissions.tsx (MODIFIED - use backend API)
```

### Environment
```
.env (Frontend - UNCHANGED):
  VITE_SUPABASE_URL=...
  VITE_SUPABASE_PUBLISHABLE_KEY=...

.env.local (Backend - NEW):
  SUPABASE_URL=...
  SUPABASE_SERVICE_ROLE_KEY=... # NEVER expose
  SESSION_SECRET=...
  ADMIN_API_SECRET=...
```

---

## Verification Commands

### 1. Checkout Still Works
```bash
# Should return 201 Created
curl -X POST "https://iiyzyguilixigsbumqmz.supabase.co/rest/v1/orders" \
  -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"test-uuid","order_number":"TEST-001"}'
```

### 2. Admin Tables Blocked
```bash
# Should return 403 Forbidden
curl -X GET "https://iiyzyguilixigsbumqmz.supabase.co/rest/v1/stock_alerts" \
  -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY"
```

### 3. Backend API Works
```bash
# Should return 200 with data
curl -X GET "http://localhost:3000/api/admin/stock-alerts" \
  -H "Content-Type: application/json"
```

### 4. Audit Log Auto-Populated
```sql
-- In Supabase SQL Editor, should show admin actions
SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10;
```

---

## Security Checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` in backend `.env` only (NEVER frontend)
- [ ] Migrations deployed with `auth.role() = 'service_role'` checks
- [ ] Direct API calls to `stock_alerts` return 403 Forbidden
- [ ] Direct API calls to `commission_approvals` return 403 Forbidden
- [ ] Direct API calls to `audit_log` return 403 Forbidden
- [ ] Admin pages call `/api/admin/*` endpoints (not Supabase)
- [ ] Backend verifies `is_admin` before executing admin operations
- [ ] Audit log records all admin actions automatically
- [ ] Checkout flow tested and working
- [ ] Admin pages tested and working
- [ ] Load tested: Backend handles concurrent requests

---

## Timeline

**Best Case (Everything works):**
- Day 1: Backend setup & deployment
- Day 2: Migrations deployed, admin pages updated
- Day 3: Testing & verification
- **Total: 3 days**

**With Issues (Delays):**
- Day 1: Backend setup (+ auth issues = +1 day)
- Day 2: Migrations (+ rollback = +2 days)
- Day 3-4: Admin page updates
- Day 4-5: Testing & debugging
- **Total: 5-6 days**

---

## Success Metrics

✅ **Post-Deployment Success Indicators:**
- Checkout flow: 1000+ orders placed without issues
- Admin dashboard: All admins can perform operations via API
- Security: Zero unauthorized admin table access attempts
- Audit trail: Every admin action logged with timestamp
- Performance: API response time < 500ms for admin operations
- Stability: Zero backend 500 errors

---

## Next Steps After Deployment

Once this production architecture is stable:

1. **Implement staff authentication** (future)
   - Create login form for staff users
   - Map `staff_users` to Supabase Auth users
   - Update RLS to use `auth.uid()` instead of `auth.role()`
   - Migrate admin access from `customers.is_admin` to `staff_users.role`

2. **Add rate limiting** (security)
   - Prevent admin API spam/DOS attacks
   - Implement per-user rate limits

3. **Add request signing** (security)
   - Backend signs admin requests with HMAC
   - Frontend validates signature before accepting responses

4. **Add 2FA for admins** (compliance)
   - Optional: Require 2FA for admin login
   - TOTP or email-based

---

## Questions?

For implementation help:
1. Check SERVER_API_GUIDE.md for complete backend code
2. Review migration files for RLS policy syntax
3. Test in staging first before production deployment
