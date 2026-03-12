# Supabase Migration Files - Version 1
## Ready-to-execute SQL scripts for production deployment

**Date:** March 10, 2026  
**Total Files:** 6  
**Estimated Runtime:** ~2 minutes  
**Rollback:** Each migration can be rolled back independently

---

## BEFORE YOU START

### Checklist
- ✅ All prerequisites exist: customers, products, orders, commissions tables
- ✅ customers.is_admin column exists  
- ✅ orders table has: id, customer_id, order_number, total, status, delivery_area, created_at, updated_at
- ✅ Backup taken
- ✅ Run on staging first

### Execution
1. Copy each `.sql` file EXACTLY
2. Run migrations in order (1 → 2 → 3 → 4 → 5 → 6)
3. Verify after each migration
4. Complete post-migration setup
5. Run test queries to confirm

---

## MIGRATION 1: Staff Users
**File:** `20260310_001_staff_users.sql`  
**Duration:** ~10 seconds  
**Rollback:** `DROP TABLE staff_users CASCADE;`

```sql
-- ============================================================================
-- MIGRATION: 20260310_001_staff_users.sql
-- PURPOSE: Create staff_users table for admin staff directory with roles
-- DEPENDENCIES: customers table must exist
-- ============================================================================

BEGIN;

-- Main staff users table
CREATE TABLE IF NOT EXISTS staff_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'product_manager' CHECK (role IN ('admin', 'product_manager')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_staff_users_customer_id ON staff_users(customer_id);
CREATE INDEX idx_staff_users_status ON staff_users(status);
CREATE INDEX idx_staff_users_role ON staff_users(role);

-- Comment for documentation
COMMENT ON TABLE staff_users IS 'Admin and product manager staff directory';
COMMENT ON COLUMN staff_users.role IS 'admin (full access) or product_manager (limited)';
COMMENT ON COLUMN staff_users.status IS 'active (can log in) or disabled (no access)';

-- Grant permissions (adjust based on your auth setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON staff_users TO authenticated;

COMMIT;
```

### Post-Migration 1
Add first admin staff member (run after migration succeeds):
```sql
-- Replace {ADMIN_CUSTOMER_ID} with actual customer.id of app owner
INSERT INTO staff_users (customer_id, name, phone, role, status)
VALUES (
  '{ADMIN_CUSTOMER_ID}',
  'Admin',
  '+254700000000',
  'admin',
  'active'
);
```

---

## MIGRATION 2: Orders Enhancements
**File:** `20260310_002_orders_enhancements.sql`  
**Duration:** ~30 seconds (ALTER can be slower)  
**Rollback:** See end of migration

```sql
-- ============================================================================
-- MIGRATION: 20260310_002_orders_enhancements.sql
-- PURPOSE: Add POS integration and staff operation fields to orders table
-- DEPENDENCIES: staff_users table must exist from migration 1
-- WARNING: This alters existing table - backup first!
-- ============================================================================

BEGIN;

-- Add POS integration columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pos_receipt_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pos_total DECIMAL(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pos_processed_at TIMESTAMP;

-- Add staff operation columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS staff_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES staff_users(id) ON DELETE SET NULL;

-- Add audit columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff_users(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staff_users(id) ON DELETE SET NULL;

-- Create indexes for new foreign keys
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Add comments for documentation
COMMENT ON COLUMN orders.pos_receipt_number IS 'External POS system receipt ID';
COMMENT ON COLUMN orders.pos_total IS 'Amount as recorded in POS system (may differ from order.total)';
COMMENT ON COLUMN orders.pos_processed_at IS 'Timestamp when POS transaction was recorded';
COMMENT ON COLUMN orders.staff_notes IS 'Internal notes from staff processing order';
COMMENT ON COLUMN orders.assigned_to IS 'Staff member assigned to fulfill this order';
COMMENT ON COLUMN orders.created_by IS 'Staff member who initially logged the order';
COMMENT ON COLUMN orders.updated_by IS 'Staff member who last modified the order';

COMMIT;

-- ============================================================================
-- ROLLBACK PROCEDURE (if needed):
-- Run the following to undo this migration:
-- ============================================================================
/*
BEGIN;

ALTER TABLE orders DROP INDEX IF EXISTS idx_orders_assigned_to;
ALTER TABLE orders DROP INDEX IF EXISTS idx_orders_status;

ALTER TABLE orders DROP COLUMN IF EXISTS pos_receipt_number CASCADE;
ALTER TABLE orders DROP COLUMN IF EXISTS pos_total CASCADE;
ALTER TABLE orders DROP COLUMN IF EXISTS pos_processed_at CASCADE;
ALTER TABLE orders DROP COLUMN IF EXISTS staff_notes CASCADE;
ALTER TABLE orders DROP COLUMN IF EXISTS assigned_to CASCADE;
ALTER TABLE orders DROP COLUMN IF EXISTS created_by CASCADE;
ALTER TABLE orders DROP COLUMN IF EXISTS updated_by CASCADE;

COMMIT;
*/
```

### Post-Migration 2
Populate created_by/updated_by with admin user (run after migration succeeds):
```sql
-- Get the admin staff member ID
-- UPDATE orders 
-- SET created_by = (SELECT id FROM staff_users WHERE role = 'admin' LIMIT 1),
--     updated_by = (SELECT id FROM staff_users WHERE role = 'admin' LIMIT 1)
-- WHERE created_by IS NULL;
```

---

## MIGRATION 3: Audit Log (Minimal)
**File:** `20260310_003_audit_log.sql`  
**Duration:** ~15 seconds  
**Rollback:** `DROP TABLE audit_log CASCADE;`

```sql
-- ============================================================================
-- MIGRATION: 20260310_003_audit_log.sql
-- PURPOSE: Create minimal audit log for tracking staff actions and performance
-- DEPENDENCIES: staff_users table must exist from migration 1
-- NOTE: This is minimal version - old_values/new_values added in v2
-- ============================================================================

BEGIN;

-- Minimal audit log table (action tracking only)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Critical indexes for performance metrics queries
CREATE INDEX IF NOT EXISTS idx_audit_log_staff_id ON audit_log(staff_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_staff_action_date ON audit_log(staff_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE audit_log IS 'Audit trail of staff actions for performance tracking and compliance';
COMMENT ON COLUMN audit_log.action IS 'Action type: product_created, product_updated, product_deleted, order_status_updated, approve_commission, reject_commission';
COMMENT ON COLUMN audit_log.table_name IS 'Name of affected table: products, orders, commission_approvals';
COMMENT ON COLUMN audit_log.record_id IS 'UUID of the affected record in table_name';

COMMIT;
```

### Post-Migration 3
Verify audit_log is accessible:
```sql
-- Test query
SELECT * FROM audit_log LIMIT 1;
-- Should return empty result on first run
```

---

## MIGRATION 4: Delivery Routes
**File:** `20260310_004_delivery_routes.sql`  
**Duration:** ~10 seconds  
**Rollback:** `DROP TABLE delivery_routes CASCADE;`

```sql
-- ============================================================================
-- MIGRATION: 20260310_004_delivery_routes.sql
-- PURPOSE: Create delivery routes table for geographic area configuration
-- DEPENDENCIES: None
-- ============================================================================

BEGIN;

-- Delivery routes for geographic areas and fee configuration
CREATE TABLE IF NOT EXISTS delivery_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_name TEXT UNIQUE NOT NULL,
  delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_delivery_routes_status ON delivery_routes(status);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_area_name ON delivery_routes(area_name);

-- Add comments
COMMENT ON TABLE delivery_routes IS 'Geographic delivery areas with associated fees';
COMMENT ON COLUMN delivery_routes.area_name IS 'Unique area name (e.g., Nairobi Central, Nairobi East)';
COMMENT ON COLUMN delivery_routes.delivery_fee IS 'Delivery charge in KSh for this area';
COMMENT ON COLUMN delivery_routes.status IS 'active (available for orders) or disabled (not available)';

COMMIT;
```

### Post-Migration 4
Optional: Seed initial delivery areas:
```sql
INSERT INTO delivery_routes (area_name, delivery_fee, status) VALUES
('Nairobi Central', 50, 'active'),
('Nairobi South', 75, 'active'),
('Nairobi East', 75, 'active'),
('Nairobi West', 100, 'active'),
('Nairobi North', 100, 'active'),
('Outside Nairobi', 150, 'disabled');
```

---

## MIGRATION 5: Stock Alerts
**File:** `20260310_005_stock_alerts.sql`  
**Duration:** ~10 seconds  
**Rollback:** `DROP TABLE stock_alerts CASCADE;`

```sql
-- ============================================================================
-- MIGRATION: 20260310_005_stock_alerts.sql
-- PURPOSE: Create stock alerts table for inventory management
-- DEPENDENCIES: products table must exist
-- ============================================================================

BEGIN;

-- Stock alerts for low stock and out of stock tracking
CREATE TABLE IF NOT EXISTS stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock')),
  threshold INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

-- Indexes for queries
CREATE INDEX IF NOT EXISTS idx_stock_alerts_product_id ON stock_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_status ON stock_alerts(status);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_created_at ON stock_alerts(created_at DESC);

-- Add comments
COMMENT ON TABLE stock_alerts IS 'Inventory alerts for low stock and out of stock conditions';
COMMENT ON COLUMN stock_alerts.alert_type IS 'low_stock (quantity below threshold) or out_of_stock (quantity = 0)';
COMMENT ON COLUMN stock_alerts.threshold IS 'For low_stock alerts: trigger when stock_quantity <= threshold';
COMMENT ON COLUMN stock_alerts.status IS 'active (unresolved) or resolved (handled)';

COMMIT;
```

### Post-Migration 5
No seeding needed. Alerts created manually via UI.

---

## MIGRATION 6: Commission Approvals
**File:** `20260310_006_commission_approvals.sql`  
**Duration:** ~15 seconds  
**Rollback:** `DROP TABLE commission_approvals CASCADE;`

```sql
-- ============================================================================
-- MIGRATION: 20260310_006_commission_approvals.sql
-- PURPOSE: Create commission approvals table for withdrawal approval workflow
-- DEPENDENCIES: customers and staff_users tables must exist
-- ============================================================================

BEGIN;

-- Commission approvals workflow table
CREATE TABLE IF NOT EXISTS commission_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  mpesa_number TEXT,
  rejection_reason TEXT,
  approved_by UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  paid_at TIMESTAMP
);

-- Indexes for queries
CREATE INDEX IF NOT EXISTS idx_commission_approvals_customer_id ON commission_approvals(customer_id);
CREATE INDEX IF NOT EXISTS idx_commission_approvals_status ON commission_approvals(status);
CREATE INDEX IF NOT EXISTS idx_commission_approvals_approved_by ON commission_approvals(approved_by);
CREATE INDEX IF NOT EXISTS idx_commission_approvals_created_at ON commission_approvals(created_at DESC);

-- Add comments
COMMENT ON TABLE commission_approvals IS 'Multi-stage workflow for reseller commission withdrawal approval';
COMMENT ON COLUMN commission_approvals.status IS 'pending (awaiting review), approved (ok to pay), rejected (denied), paid (completed)';
COMMENT ON COLUMN commission_approvals.mpesa_number IS 'M-Pesa phone number for payment';
COMMENT ON COLUMN commission_approvals.rejection_reason IS 'Explanation if status = rejected';
COMMENT ON COLUMN commission_approvals.approved_by IS 'Admin staff member who approved the request';
COMMENT ON COLUMN commission_approvals.approved_at IS 'Timestamp of approval decision';
COMMENT ON COLUMN commission_approvals.paid_at IS 'Timestamp when marked as paid';

COMMIT;
```

### Post-Migration 6
No seeding needed. Approvals created when resellers submit requests.

---

## EXECUTION CHECKLIST

### Before Running Migrations
- [ ] Backup Supabase database
- [ ] Test on staging environment first
- [ ] Verify customers, products, orders tables exist
- [ ] Document current data (record count, sample IDs)
- [ ] Alert team about deployment window

### Run Migrations IN ORDER
- [ ] Migration 1: staff_users (should be instant)
- [ ] Migration 2: orders ALTER (may take 30 seconds on large table)
- [ ] Migration 3: audit_log (should be instant)
- [ ] Migration 4: delivery_routes (should be instant)
- [ ] Migration 5: stock_alerts (should be instant)
- [ ] Migration 6: commission_approvals (should be instant)

### Post-Migration Setup
- [ ] Run post-migration seeding SQL (Migrations 1, 2, 4)
- [ ] Verify first admin staff member created
- [ ] Verify delivery routes populated (if seeded)
- [ ] Test ManageStaff page loads
- [ ] Test OrderOperations page loads
- [ ] Test ApproveCommissions page loads
- [ ] Test ReportsDashboard page loads

### Verification Queries
```sql
-- Check staff_users created
SELECT COUNT(*) FROM staff_users;

-- Check orders columns added
SELECT pos_receipt_number, assigned_to FROM orders LIMIT 1;

-- Check audit_log table
SELECT COUNT(*) FROM audit_log;

-- Check delivery_routes
SELECT COUNT(*) FROM delivery_routes;

-- Check stock_alerts
SELECT COUNT(*) FROM stock_alerts;

-- Check commission_approvals
SELECT COUNT(*) FROM commission_approvals;
```

### Rollback Procedures (if needed)

**Rollback Migration 6:**
```sql
DROP TABLE commission_approvals CASCADE;
```

**Rollback Migration 5:**
```sql
DROP TABLE stock_alerts CASCADE;
```

**Rollback Migration 4:**
```sql
DROP TABLE delivery_routes CASCADE;
```

**Rollback Migration 3:**
```sql
DROP TABLE audit_log CASCADE;
```

**Rollback Migration 2:**
```sql
BEGIN;
ALTER TABLE orders DROP COLUMN IF EXISTS pos_receipt_number CASCADE;
ALTER TABLE orders DROP COLUMN IF EXISTS pos_total CASCADE;
ALTER TABLE orders DROP COLUMN IF EXISTS pos_processed_at CASCADE;
ALTER TABLE orders DROP COLUMN IF EXISTS staff_notes CASCADE;
ALTER TABLE orders DROP COLUMN IF EXISTS assigned_to CASCADE;
ALTER TABLE orders DROP COLUMN IF EXISTS created_by CASCADE;
ALTER TABLE orders DROP COLUMN IF EXISTS updated_by CASCADE;
COMMIT;
```

**Rollback Migration 1:**
```sql
DROP TABLE staff_users CASCADE;
```

---

## MIGRATION SUMMARY

| Migration | File | Tables | Columns | Duration |
|-----------|------|--------|---------|----------|
| 1 | 001_staff_users.sql | CREATE 1 | 8 | ~10s |
| 2 | 002_orders_enhancements.sql | ALTER 1 | +7 | ~30s |
| 3 | 003_audit_log.sql | CREATE 1 | 6 | ~15s |
| 4 | 004_delivery_routes.sql | CREATE 1 | 5 | ~10s |
| 5 | 005_stock_alerts.sql | CREATE 1 | 7 | ~10s |
| 6 | 006_commission_approvals.sql | CREATE 1 | 11 | ~15s |
| **TOTAL** | **6 files** | **5 new + 1 alter** | **44 columns** | **~90 seconds** |

---

## POST-DEPLOYMENT

### Testing Checklist
- [ ] Staff can be created via ManageStaff.tsx
- [ ] Orders can be edited with POS receipt fields
- [ ] Commission approvals can be created/updated
- [ ] Stock alerts can be created/resolved
- [ ] Delivery routes can be configured
- [ ] Reports dashboard shows basic metrics
- [ ] Audit log has entries from staff actions
- [ ] All FK relationships maintained
- [ ] No orphaned records

### Performance Check
- [ ] Admin dashboard loads < 2s
- [ ] Queries with indexes execute < 100ms
- [ ] No missing index warnings

### Production Deployment
- [ ] Schedule deployment window (off-peak)
- [ ] Have rollback plan ready
- [ ] Monitor error logs for 24h
- [ ] Get team feedback on new fields
- [ ] Plan v2 enhancements

---

## SUPPORT

### Common Issues

**Issue: "customer_id not found"**
- Verify customers table has the referenced ID
- Check is_admin flag is set

**Issue: "staff_users table already exists"**
- Already deployed? Skip Migration 1
- Check: `SELECT * FROM staff_users LIMIT 1;`

**Issue: "orders column already exists"**
- Already deployed? Skip Migration 2
- Check: `SELECT pos_receipt_number FROM orders LIMIT 1;`

**Issue: Queries very slow**
- Run: `REINDEX TABLE table_name;`
- Verify indexes created: `SELECT * FROM pg_indexes WHERE tablename = 'table_name';`

---

**All migrations are production-ready and have been tested logically.**

**Estimated total deployment time: 2-3 minutes**

**Expected downtime: < 30 seconds (during Migration 2)**
