# Supabase Schema - Version 1 (Minimal Production)
## Stery Shop Earn Admin Features - Lean Implementation

**Date:** March 10, 2026  
**Scope:** Staff management, Delivery routes, Stock alerts, Order operations, Commission approvals, Core reporting  
**Philosophy:** Production-safe, minimal, no over-engineering

---

## EXECUTIVE SUMMARY

### Version 1 Tables: 5 New + 2 Alterations
- ✅ **Create New:** staff_users, delivery_routes, stock_alerts, commission_approvals, audit_log (minimal)
- ✅ **Alter Existing:** orders (add POS + staff fields), products (verify columns)
- ❌ **Postpone:** product_import_jobs, product_images, product_variants, advanced audit tracking

### Migration Order (Critical)
1. Create staff_users (base dependency)
2. Alter orders (add FK to staff_users)
3. Create audit_log (minimal version)
4. Create delivery_routes
5. Create stock_alerts
6. Create commission_approvals

---

## MUST-HAVE TABLES FOR VERSION 1

### 1. staff_users (NEW)
**Purpose:** Admin staff directory with roles  
**Criticality:** 🔴 CRITICAL - Blocks all other staff operations

```sql
CREATE TABLE staff_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE REFERENCES customers(id),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'product_manager')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_staff_users_customer_id ON staff_users(customer_id);
CREATE INDEX idx_staff_users_status ON staff_users(status);
CREATE INDEX idx_staff_users_role ON staff_users(role);
```

**Columns:**
| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | Staff identity |
| `customer_id` | UUID FK (UNIQUE) | Link to customer/auth user |
| `name` | TEXT | Display name |
| `phone` | TEXT UNIQUE | Contact number |
| `role` | TEXT | 'admin' or 'product_manager' |
| `status` | TEXT | 'active' or 'disabled' |
| `created_at` | TIMESTAMP | Onboarding date |
| `updated_at` | TIMESTAMP | Last modification |

**Why lean:** No audit fields (created_by, updated_by) - add in v2 if needed  
**Dependencies:** ManageStaff.tsx, useStaffManagement.ts  
**Must exist before:** audit_log, orders.assigned_to

---

### 2. orders (ALTER EXISTING)
**Purpose:** Add POS integration and staff operation tracking  
**Criticality:** 🔴 CRITICAL - Enables OrderOperations page

**Add these columns to existing orders table:**

```sql
ALTER TABLE orders ADD COLUMN pos_receipt_number TEXT;
ALTER TABLE orders ADD COLUMN pos_total DECIMAL(10, 2);
ALTER TABLE orders ADD COLUMN pos_processed_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN staff_notes TEXT;
ALTER TABLE orders ADD COLUMN assigned_to UUID REFERENCES staff_users(id);
ALTER TABLE orders ADD COLUMN created_by UUID REFERENCES staff_users(id);
ALTER TABLE orders ADD COLUMN updated_by UUID REFERENCES staff_users(id);

CREATE INDEX idx_orders_assigned_to ON orders(assigned_to);
CREATE INDEX idx_orders_status ON orders(status);
```

**New Columns:**
| Column | Type | Purpose |
|--------|------|---------|
| `pos_receipt_number` | TEXT | External POS system ID |
| `pos_total` | DECIMAL(10,2) | POS recorded amount |
| `pos_processed_at` | TIMESTAMP | POS transaction time |
| `staff_notes` | TEXT | Order processing notes |
| `assigned_to` | UUID FK | Staff member handling |
| `created_by` | UUID FK | Staff who logged order |
| `updated_by` | UUID FK | Staff who last updated |

**Why alter existing:** Orders table already exists, just add fields  
**Existing fields to verify:** status, customer_id, total, delivery_area, created_at, updated_at  
**Dependencies:** OrderOperations.tsx, useOrderOperations.ts, AdminOrders.tsx

---

### 3. delivery_routes (NEW)
**Purpose:** Geographic delivery area configuration  
**Criticality:** 🟡 HIGH - Required for orders.delivery_area mapping

```sql
CREATE TABLE delivery_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_name TEXT UNIQUE NOT NULL,
  delivery_fee DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_delivery_routes_status ON delivery_routes(status);
CREATE INDEX idx_delivery_routes_area_name ON delivery_routes(area_name);
```

**Columns:**
| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | Route identity |
| `area_name` | TEXT UNIQUE | Geographic area name |
| `delivery_fee` | DECIMAL(10,2) | Cost for area |
| `status` | TEXT | 'active' or 'disabled' |
| `created_at` | TIMESTAMP | Creation date |
| `updated_at` | TIMESTAMP | Last update |

**Why lean:** No created_by/updated_by auditing - add in v2  
**Dependencies:** ManageDeliveryRoutes.tsx, useDeliveryRoutes.ts, orders.delivery_area  
**Note:** Existing orders already reference this via delivery_area field, just configure the lookup table

---

### 4. stock_alerts (NEW)
**Purpose:** Track inventory alerts (low stock / out of stock)  
**Criticality:** 🟡 HIGH - Required for stock management

```sql
CREATE TABLE stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock')),
  threshold INTEGER, -- For low_stock: trigger when stock <= threshold
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

CREATE INDEX idx_stock_alerts_product_id ON stock_alerts(product_id);
CREATE INDEX idx_stock_alerts_status ON stock_alerts(status);
```

**Columns:**
| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | Alert identity |
| `product_id` | UUID FK | Alert target product |
| `alert_type` | TEXT | 'low_stock' or 'out_of_stock' |
| `threshold` | INTEGER | Trigger level for low_stock |
| `status` | TEXT | 'active' or 'resolved' |
| `created_at` | TIMESTAMP | Alert creation |
| `resolved_at` | TIMESTAMP | When resolved |

**Why lean:** No staff audit trail (created_by, resolved_by) - v2 enhancement  
**Dependencies:** StockAlerts.tsx, useStockAlerts.ts  
**Display:** Join with products to show product_name

---

### 5. commission_approvals (NEW)
**Purpose:** Multi-stage approval workflow for commission withdrawals  
**Criticality:** 🔴 CRITICAL - Required for commission system

```sql
CREATE TABLE commission_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  mpesa_number TEXT,
  rejection_reason TEXT,
  approved_by UUID REFERENCES staff_users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  paid_at TIMESTAMP
);

CREATE INDEX idx_commission_approvals_customer_id ON commission_approvals(customer_id);
CREATE INDEX idx_commission_approvals_status ON commission_approvals(status);
CREATE INDEX idx_commission_approvals_approved_by ON commission_approvals(approved_by);
```

**Columns:**
| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | Approval request identity |
| `customer_id` | UUID FK | Reseller requesting payment |
| `amount` | DECIMAL(10,2) | Requested amount (KSh) |
| `status` | TEXT | pending → approved/rejected → paid |
| `mpesa_number` | TEXT | M-Pesa recipient number |
| `rejection_reason` | TEXT | Why rejected (if rejected) |
| `approved_by` | UUID FK | Approving staff member |
| `created_at` | TIMESTAMP | Request time |
| `updated_at` | TIMESTAMP | Last status change |
| `approved_at` | TIMESTAMP | Approval timestamp |
| `paid_at` | TIMESTAMP | Payment timestamp |

**Why lean:** Simple status tracking, no other audit fields  
**Dependencies:** ApproveCommissions.tsx, useCommissionApprovals.ts  
**Workflow:** Reseller submits → admin approves/rejects → admin marks paid

---

### 6. audit_log (NEW - MINIMAL VERSION)
**Purpose:** Track staff actions for basic performance reporting  
**Criticality:** 🟡 HIGH - Required for StaffPerformanceMetrics

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_staff_id ON audit_log(staff_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_staff_action_date ON audit_log(staff_id, action, created_at DESC);
```

**Columns:**
| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | Log entry identity |
| `staff_id` | UUID FK | Acting staff member |
| `action` | TEXT | Action name (product_created, order_updated, etc.) |
| `table_name` | TEXT | Table affected (products, orders) |
| `record_id` | UUID | ID of affected record |
| `created_at` | TIMESTAMP | Timestamp of action |

**Why lean:** No old_values/new_values JSONB (v2 enhancement)  
**Action types to track:**
- product_created, product_updated, product_deleted
- order_status_updated
- approve_commission, reject_commission

**Performance Metrics from audit_log:**
```sql
-- Products uploaded
SELECT COUNT(*) FROM audit_log 
WHERE staff_id = ? AND action = 'product_created'

-- Orders processed  
SELECT COUNT(DISTINCT record_id) FROM audit_log
WHERE staff_id = ? AND action = 'order_status_updated'

-- Commissions approved
SELECT COUNT(*) FROM audit_log
WHERE staff_id = ? AND action = 'approve_commission'

-- Last activity
SELECT MAX(created_at) FROM audit_log WHERE staff_id = ?
```

**Dependencies:** StaffPerformanceMetrics.tsx, triggers on product/order/commission changes  
**Note:** Triggers must be created to auto-insert records when staff make changes

---

## EXISTING TABLES - STATUS CHECK

### products (EXISTING)
**Status:** ✅ Already exists  
**Verify these columns exist:**
- id, name, price, category, description, image_url
- stock_quantity, in_stock
- commission (for commission calculations)

**Verify relationships:**
- No changes needed for Version 1

---

### customers (EXISTING)
**Status:** ✅ Already exists with extensions  
**Existing columns for Version 1:**
- id, email, name, phone
- is_admin (for access control)
- referral_code (for referral system)

**No changes needed**

---

### commissions (EXISTING)
**Status:** ✅ Already exists  
**Verify these columns:**
- id, reseller_id, order_id, product_name, amount, status, created_at

**No changes needed for Version 1**

---

### orders (EXISTING - SEE ALTERATION ABOVE)
**Status:** ⚠️ Needs POS + staff fields added (see section 2)

---

## POSTPONE TO VERSION 2+

### ❌ product_import_jobs
**Why postpone:** Bulk import is a convenience feature, not core business need  
**When to add:** After manual staff workflows are proven stable

### ❌ product_images
**Why postpone:** Existing image_url field is sufficient for MVP  
**When to add:** When multi-image gallery is needed

### ❌ product_variants
**Why postpone:** Variants (size/color) not part of current product model  
**When to add:** When product variations become business requirement

### ❌ Advanced audit_log fields
**Why postpone:** old_values/new_values JSONB adds complexity without immediate value  
**When to add:** When detailed change tracking is required

### ❌ Delivery route audit fields
**Why postpone:** created_by/updated_by not needed for core operations  
**When to add:** When full admin audit is required

### ❌ Stock alert audit fields
**Why postpone:** created_by/resolved_by not essential for MVP  
**When to add:** When detailed alert history is required

---

## MIGRATION PLAN FOR VERSION 1

### Prerequisites
- All existing tables (customers, products, orders, commissions) must exist
- customers.is_admin must exist
- orders table must be ready for alterations
- Firebase auth setup complete

### Migration Sequence (STRICT ORDER)

#### **Step 1: Create staff_users table**
**File:** `20260310_001_staff_users.sql`  
**Reason:** Base dependency for all other Version 1 tables  
**Duration:** ~10 seconds

```sql
-- STEP 1
CREATE TABLE staff_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE REFERENCES customers(id),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'product_manager')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_staff_users_customer_id ON staff_users(customer_id);
CREATE INDEX idx_staff_users_status ON staff_users(status);
CREATE INDEX idx_staff_users_role ON staff_users(role);

-- Seed: Add first admin (app owner)
-- Done manually after migration: INSERT INTO staff_users (customer_id, name, phone, role) VALUES (?, ?, ?, 'admin');
```

---

#### **Step 2: Alter orders table**
**File:** `20260310_002_orders_enhancements.sql`  
**Reason:** Depends on staff_users.id existing  
**Duration:** ~30 seconds (ALTER can be slower)

```sql
-- STEP 2
ALTER TABLE orders ADD COLUMN pos_receipt_number TEXT;
ALTER TABLE orders ADD COLUMN pos_total DECIMAL(10, 2);
ALTER TABLE orders ADD COLUMN pos_processed_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN staff_notes TEXT;
ALTER TABLE orders ADD COLUMN assigned_to UUID REFERENCES staff_users(id);
ALTER TABLE orders ADD COLUMN created_by UUID REFERENCES staff_users(id);
ALTER TABLE orders ADD COLUMN updated_by UUID REFERENCES staff_users(id);

CREATE INDEX idx_orders_assigned_to ON orders(assigned_to);
CREATE INDEX idx_orders_status ON orders(status);

-- Note: After migration, populate created_by/updated_by with admin user
-- UPDATE orders SET created_by = (SELECT id FROM staff_users LIMIT 1), updated_by = (SELECT id FROM staff_users LIMIT 1) WHERE created_by IS NULL;
```

---

#### **Step 3: Create audit_log table (minimal)**
**File:** `20260310_003_audit_log.sql`  
**Reason:** Depends on staff_users.id  
**Duration:** ~15 seconds

```sql
-- STEP 3
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_staff_id ON audit_log(staff_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_staff_action_date ON audit_log(staff_id, action, created_at DESC);
```

---

#### **Step 4: Create delivery_routes table**
**File:** `20260310_004_delivery_routes.sql`  
**Reason:** Standalone, no dependencies  
**Duration:** ~10 seconds

```sql
-- STEP 4
CREATE TABLE delivery_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_name TEXT UNIQUE NOT NULL,
  delivery_fee DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_delivery_routes_status ON delivery_routes(status);
CREATE INDEX idx_delivery_routes_area_name ON delivery_routes(area_name);

-- Seed: Add common delivery areas (examples)
-- INSERT INTO delivery_routes (area_name, delivery_fee) VALUES
-- ('Nairobi Central', 50),
-- ('Nairobi South', 75),
-- ('Nairobi East', 75),
-- ('Nairobi West', 100),
-- ('Nairobi North', 100);
```

---

#### **Step 5: Create stock_alerts table**
**File:** `20260310_005_stock_alerts.sql`  
**Reason:** Depends on products.id  
**Duration:** ~10 seconds

```sql
-- STEP 5
CREATE TABLE stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock')),
  threshold INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

CREATE INDEX idx_stock_alerts_product_id ON stock_alerts(product_id);
CREATE INDEX idx_stock_alerts_status ON stock_alerts(status);
```

---

#### **Step 6: Create commission_approvals table**
**File:** `20260310_006_commission_approvals.sql`  
**Reason:** Depends on customers.id and staff_users.id  
**Duration:** ~15 seconds

```sql
-- STEP 6
CREATE TABLE commission_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  mpesa_number TEXT,
  rejection_reason TEXT,
  approved_by UUID REFERENCES staff_users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  paid_at TIMESTAMP
);

CREATE INDEX idx_commission_approvals_customer_id ON commission_approvals(customer_id);
CREATE INDEX idx_commission_approvals_status ON commission_approvals(status);
CREATE INDEX idx_commission_approvals_approved_by ON commission_approvals(approved_by);
```

---

### Post-Migration Setup (Manual)

#### 1. Initialize first admin staff member
```sql
-- After Step 1 completes
INSERT INTO staff_users (customer_id, name, phone, role) 
VALUES (
  (SELECT id FROM customers WHERE is_admin = true LIMIT 1),
  'Admin',
  '+254700000000',
  'admin'
);
```

#### 2. Populate orders table created_by/updated_by
```sql
-- After Step 2 completes
UPDATE orders 
SET created_by = (SELECT id FROM staff_users WHERE role = 'admin' LIMIT 1),
    updated_by = (SELECT id FROM staff_users WHERE role = 'admin' LIMIT 1)
WHERE created_by IS NULL;
```

#### 3. Add seed data for delivery routes (optional)
```sql
-- After Step 4 completes
INSERT INTO delivery_routes (area_name, delivery_fee) VALUES
('Nairobi Central', 50),
('Nairobi South', 75),
('Nairobi East', 75),
('Nairobi West', 100),
('Nairobi North', 100);
```

---

## VERSION 1 FEATURE COMPLETENESS

### ✅ Staff Management
- **Tables:** staff_users
- **Pages:** ManageStaff.tsx
- **Hooks:** useStaffManagement.ts
- **Features:** Add/edit/delete staff, assign roles, toggle status

### ✅ Order Operations  
- **Tables:** orders (altered), staff_users
- **Pages:** OrderOperations.tsx, AdminOrders.tsx
- **Hooks:** useOrderOperations.ts
- **Features:** Update order status, record POS receipt, add staff notes, assign to staff

### ✅ Commission Approvals
- **Tables:** commission_approvals
- **Pages:** ApproveCommissions.tsx
- **Hooks:** useCommissionApprovals.ts
- **Features:** Tab-based filtering, approve/reject, mark as paid

### ✅ Delivery Routes
- **Tables:** delivery_routes
- **Pages:** ManageDeliveryRoutes.tsx
- **Hooks:** useDeliveryRoutes.ts
- **Features:** Add/edit areas, set fees, toggle status

### ✅ Stock Alerts
- **Tables:** stock_alerts
- **Pages:** StockAlerts.tsx
- **Hooks:** useStockAlerts.ts
- **Features:** Create/resolve alerts, set thresholds

### ✅ Core Reporting
- **Tables:** orders, commission_approvals, audit_log
- **Pages:** ReportsDashboard.tsx
- **Features:** Revenue metrics, order breakdown, staff activity (from audit_log)

### ✅ Staff Performance (Basic)
- **Tables:** audit_log
- **Pages:** StaffPerformanceMetrics.tsx
- **Features:** Product uploads, order updates, commissions approved counts, last activity

---

## TESTING CHECKLIST

After migrations are applied:

- [ ] Staff users can be created/edited/deleted
- [ ] Order operations page loads with POS fields visible
- [ ] Commission approvals can be created and moved through workflow
- [ ] Delivery routes can be configured
- [ ] Stock alerts can be created and resolved
- [ ] Reports dashboard displays basic metrics
- [ ] Audit log entries are created when staff perform actions
- [ ] All FK relationships maintain referential integrity
- [ ] No orphaned records when deleting staff/products

---

## TOTAL COST OF SCHEMA CHANGES

- **Migrations:** 6 files
- **New tables:** 5 (staff_users, audit_log, delivery_routes, stock_alerts, commission_approvals)
- **Altered tables:** 1 (orders)
- **Total indexes:** 12
- **Execution time:** ~2 minutes total
- **Complexity:** Low - straightforward schema, no advanced features

---

## NEXT STEPS AFTER VERSION 1

### Version 2 Candidates (Post-MVP)
1. Product import jobs - bulk CSV import
2. Product images/variants - enhanced product management
3. Advanced audit tracking - old_values/new_values JSONB
4. Staff audit fields - created_by/updated_by on all tables
5. Automated alerts - triggers for out-of-stock detection
6. RLS policies - row-level security
7. API endpoint development
8. Data backup/export features

---

**Version 1 is production-ready for current business needs.**

No over-engineering. No "just in case" tables. Ship fast, iterate later.
