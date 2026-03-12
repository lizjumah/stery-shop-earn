# Quick Migration Checklist

## Before Starting
- [ ] Backup Supabase (optional, auto-backup exists)
- [ ] Open https://app.supabase.com/project/iiyzyguilixigsbumqmz/sql
- [ ] Have MIGRATION_DEPLOYMENT_GUIDE.md open for full SQL

## Migration Execution

### Migration 1: Staff Users
- [ ] New Query named `01_staff_users`
- [ ] Copy section "MIGRATION 1️⃣: Staff Users → Step 2"
- [ ] Click Run
- [ ] Verify: `SELECT EXISTS (...staff_users...)` → true
- ✅ Done → Move to #2

### Migration 2: Product Enhancements  
- [ ] New Query named `02_product_enhancements`
- [ ] Copy section "MIGRATION 2️⃣"
- [ ] Click Run
- [ ] Verify: `SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'visibility'` → returns 'visibility'
- ✅ Done → Move to #3

### Migration 3: Delivery Routes
- [ ] New Query named `03_delivery_routes`
- [ ] Copy section "MIGRATION 3️⃣"
- [ ] Click Run
- [ ] Verify: `SELECT COUNT(*) FROM public.delivery_routes` → 4
- ✅ Done → Move to #4

### Migration 4: Orders Enhancement ⚠️ IMPORTANT
- [ ] New Query named `04_orders_enhancement`
- [ ] Copy section "MIGRATION 4️⃣"
- [ ] Click Run (takes 2-3 sec)
- [ ] Verify: `SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' AND column_name IN ('pos_receipt_number', 'pos_total', 'assigned_to')` → 3 rows
- ⚠️ Old status values change: pending→received, confirmed→preparing
- ✅ Done → Move to #5

### Migration 5: Audit Log
- [ ] New Query named `05_audit_log`
- [ ] Copy section "MIGRATION 5️⃣"
- [ ] Click Run
- [ ] Verify: `SELECT EXISTS (...audit_log...)` → true
- ✅ Done → Move to #6

### Migration 6: Feature Tables (Final)
- [ ] New Query named `06_feature_tables`
- [ ] Copy section "MIGRATION 6️⃣"
- [ ] Click Run
- [ ] Verify: `SELECT tablename FROM pg_tables WHERE tablename IN ('stock_alerts', 'commission_approvals')` → 2 rows
- ✅ Done → ALL MIGRATIONS COMPLETE

## After All Migrations

Run final verification:
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%'
ORDER BY tablename;
```

Should show 13+ tables including:
- audit_log ✅
- commission_approvals ✅
- commissions ✅
- customers ✅
- delivery_routes ✅
- order_items ✅
- orders ✅
- product_images ✅
- product_variants ✅
- products ✅
- points_history ✅
- referrals ✅
- staff_users ✅

## When All Done
✅ Tell me: "All 6 migrations deployed and verified"

Then I will:
1. Regenerate types.ts
2. Fix 5 admin hooks
3. Fix admin page errors
4. Run full build test
5. Verify RLS security

---
**Estimated time: 15-20 minutes**
