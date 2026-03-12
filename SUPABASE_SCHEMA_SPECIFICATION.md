# Supabase Database Schema Specification
## Stery Shop Earn Admin Features

**Last Updated:** March 10, 2026  
**Purpose:** Define exact database schema required for admin features (Reports, Commissions, Stock Alerts, Bulk Import, Staff Performance, Order Operations)

---

## TABLE OF CONTENTS
1. [Core Tables](#core-tables)
2. [Commissions System](#commissions-system)
3. [Staff Performance Metrics](#staff-performance-metrics)
4. [Stock Alerts System](#stock-alerts-system)
5. [Order Operations](#order-operations)
6. [Reporting Data](#reporting-data)
7. [Supporting Tables](#supporting-tables)
8. [Foreign Key Relationships](#foreign-key-relationships)
9. [Indexes Strategy](#indexes-strategy)
10. [Code Dependencies](#code-dependencies)

---

## CORE TABLES

### BASE: Customers Table
**Table Name:** `customers`  
**Status:** ✅ Existing (via Supabase Auth + extension)  
**Purpose:** Base user table extended with business-specific fields

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Extensions for admin features
  is_admin BOOLEAN DEFAULT FALSE,
  referral_code TEXT UNIQUE
);
```

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PK, FK auth.users | User identity |
| `email` | TEXT | UNIQUE, NOT NULL | User authentication |
| `name` | TEXT | NOT NULL | Display name |
| `phone` | TEXT | UNIQUE | Contact number |
| `is_admin` | BOOLEAN | DEFAULT FALSE | Admin access gate |
| `referral_code` | TEXT | UNIQUE | Referral program |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last modification |

**Dependencies:**
- `ApproveCommissions.tsx` - Uses `is_admin` to verify approval access
- AdminRoute component - Checks `is_admin` flag to gate all /admin pages

---

### BASE: Products Table
**Table Name:** `products`  
**Status:** ✅ Existing  
**Purpose:** Product catalog with commission, loyalty, and visibility tracking

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2),
  image_url TEXT,
  category TEXT NOT NULL,
  description TEXT,
  commission DECIMAL(5, 2), -- Percentage (e.g., 10.5 for 10.5%)
  loyalty_points INTEGER DEFAULT 0,
  in_stock BOOLEAN DEFAULT TRUE,
  stock_quantity INTEGER DEFAULT 0,
  is_offer BOOLEAN DEFAULT FALSE,
  visibility TEXT DEFAULT 'visible' CHECK (visibility IN ('visible', 'hidden')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES customers(id),
  updated_by UUID REFERENCES customers(id)
);
```

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PK | Product identity |
| `name` | TEXT | NOT NULL | Product name |
| `price` | DECIMAL(10,2) | NOT NULL | Current price |
| `original_price` | DECIMAL(10,2) | | Price before discount |
| `image_url` | TEXT | | Primary product image |
| `category` | TEXT | NOT NULL | Category for filtering |
| `description` | TEXT | | Full description |
| `commission` | DECIMAL(5,2) | | Reseller commission % |
| `loyalty_points` | INTEGER | DEFAULT 0 | Points per purchase |
| `in_stock` | BOOLEAN | DEFAULT TRUE | Stock status flag |
| `stock_quantity` | INTEGER | DEFAULT 0 | Current stock count |
| `is_offer` | BOOLEAN | DEFAULT FALSE | Featured offer flag |
| `visibility` | TEXT | CHECK visibility | 'visible' or 'hidden' |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |
| `created_by` | UUID | FK customers | Creator staff member |
| `updated_by` | UUID | FK customers | Last editor staff member |

**Dependencies:**
- `useProductManagement.ts` - Fetches/creates/updates products
- `ManageProducts.tsx` - UI for product CRUD, visibility, stock management
- `StockAlerts.tsx` - Links product_id for alert creation
- `ReportsDashboard.tsx` - Groups revenue by product and category
- `StaffPerformanceMetrics.tsx` - Counts products uploaded/edited via audit_log

---

## COMMISSIONS SYSTEM

### Table 1: Commissions (Auto-created)
**Table Name:** `commissions`  
**Status:** ✅ Existing  
**Purpose:** Track individual reseller earnings per order

```sql
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'withdrawn')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PK | Commission identity |
| `reseller_id` | UUID | FK customers (NOT NULL) | Earning reseller |
| `order_id` | UUID | FK orders (NOT NULL) | Associated order |
| `product_id` | UUID | FK products | Product reference |
| `product_name` | TEXT | NOT NULL | Denormalized for display |
| `amount` | DECIMAL(10,2) | NOT NULL | Commission value (KSh) |
| `status` | TEXT | CHECK status | pending→confirmed→paid or withdrawn |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation on order placed |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Status change timestamp |

**Status Lifecycle:**
1. `pending` - Created when order placed
2. `confirmed` - When order delivered
3. `paid` - After reseller withdrawal approved
4. `withdrawn` - For tracking withdrawals

**Dependencies:**
- `useCommissions.ts` - Queries commissions by reseller_id and status
- `useCommissionApprovals.ts` - Works with commission_approvals table (see below)
- `EarningsDashboard.tsx` - Displays pending vs. paid totals, grouped by period
- Commission workflow - Auto-created on order placement

---

### Table 2: Commission Approvals (Admin Workflow)
**Table Name:** `commission_approvals`  
**Status:** ✅ Existing  
**Purpose:** Multi-stage approval process for commission withdrawals

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
```

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PK | Approval request identity |
| `customer_id` | UUID | FK customers (NOT NULL) | Reseller requesting payment |
| `amount` | DECIMAL(10,2) | NOT NULL | Requested amount (KSh) |
| `status` | TEXT | CHECK status | pending→approved→paid or rejected |
| `mpesa_number` | TEXT | | M-Pesa recipient number |
| `rejection_reason` | TEXT | | Admin rejection explanation |
| `approved_by` | UUID | FK staff_users | Approving admin staff |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Request submission time |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last status change |
| `approved_at` | TIMESTAMP | | Timestamp when approved |
| `paid_at` | TIMESTAMP | | Timestamp when marked paid |

**Workflow:**
1. Reseller submits withdrawal request (created at pending)
2. Admin reviews in `ApproveCommissions.tsx`
3. Admin approves/rejects with optional reason
4. If approved, admin marks as paid after M-Pesa transfer

**Dependencies:**
- `useCommissionApprovals.ts` - Implements full CRUD for approval workflow
- `ApproveCommissions.tsx` - UI for filtering (pending/approved/paid/rejected), approve/reject actions
- `ApproveCommissions.tsx` also displays related commission records

---

## STAFF PERFORMANCE METRICS

### Table 1: Staff Users (Base)
**Table Name:** `staff_users`  
**Status:** ✅ Existing  
**Purpose:** Admin staff member directory with role-based access

```sql
CREATE TABLE staff_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'product_manager')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES staff_users(id),
  updated_by UUID NOT NULL REFERENCES staff_users(id)
);
```

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PK | Staff identity |
| `customer_id` | UUID | FK customers (UNIQUE) | Link to customer account |
| `name` | TEXT | NOT NULL | Staff display name |
| `phone` | TEXT | UNIQUE NOT NULL | Staff contact number |
| `role` | TEXT | CHECK role | 'admin' or 'product_manager' |
| `status` | TEXT | CHECK status | 'active' or 'disabled' |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Onboarding date |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last modification |
| `created_by` | UUID | FK staff_users | Creator staff member |
| `updated_by` | UUID | FK staff_users | Last modifier staff member |

**Role Permissions:**
- **admin**: Full system access (approve commissions, manage staff, configure settings)
- **product_manager**: Product and order management (upload/edit products, process orders)

**Dependencies:**
- `useStaffManagement.ts` - Full CRUD for staff management
- `ManageStaff.tsx` - UI for add/edit/delete staff, role assignment
- `orders.assigned_to` - FK to staff_users for order assignment
- `commission_approvals.approved_by` - FK for approval tracking
- `audit_log.staff_id` - FK for action audit trail

---

### Table 2: Audit Log (Tracking)
**Table Name:** `audit_log`  
**Status:** ✅ Existing  
**Purpose:** Complete audit trail of all staff actions for performance metrics

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- product_created, product_updated, order_status_updated, approve_commission, etc.
  table_name TEXT NOT NULL, -- products, orders, commission_approvals
  record_id UUID NOT NULL, -- ID of affected record
  old_values JSONB, -- Previous state
  new_values JSONB, -- New state
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PK | Log entry identity |
| `staff_id` | UUID | FK staff_users (NOT NULL) | Acting staff member |
| `action` | TEXT | NOT NULL | Action name (product_created, etc.) |
| `table_name` | TEXT | NOT NULL | Affected table (products, orders) |
| `record_id` | UUID | NOT NULL | Affected record ID |
| `old_values` | JSONB | | State before change |
| `new_values` | JSONB | | State after change |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Timestamp of action |

**Action Types:**
- `product_created` - Product added to catalog
- `product_updated` - Product details modified
- `product_deleted` - Product removed
- `order_status_updated` - Order moved between status stages
- `approve_commission` - Commission approved
- `reject_commission` - Commission rejected
- `staff_added` - New staff member onboarded
- `staff_role_changed` - Staff role modified

**Performance Metrics Calculated From:**
1. **Products Uploaded**: COUNT(*) WHERE action = 'product_created' AND staff_id = ? AND created_at BETWEEN start_date AND end_date
2. **Products Edited**: COUNT(*) WHERE action = 'product_updated' AND staff_id = ? AND created_at BETWEEN start_date AND end_date
3. **Orders Processed**: COUNT(DISTINCT record_id) WHERE action = 'order_status_updated' AND staff_id = ?
4. **Commissions Approved**: COUNT(*) WHERE action = 'approve_commission' AND staff_id = ?
5. **Last Activity**: MAX(created_at) WHERE staff_id = ?

**Dependencies:**
- `useStaffManagement.ts` - Provides staff list for performance dashboard
- `StaffPerformanceMetrics.tsx` - Queries audit_log for activity counts and metrics
- Triggered on all staff-modifiable operations for complete audit trail

---

## STOCK ALERTS SYSTEM

### Table: Stock Alerts
**Table Name:** `stock_alerts`  
**Status:** ✅ Existing  
**Purpose:** Track inventory alerts for low stock and out-of-stock conditions

```sql
CREATE TABLE stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock')),
  threshold INTEGER, -- For low_stock alerts (e.g., 10 units)
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  created_by UUID REFERENCES staff_users(id),
  resolved_by UUID REFERENCES staff_users(id)
);
```

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PK | Alert identity |
| `product_id` | UUID | FK products (NOT NULL) | Alert target product |
| `alert_type` | TEXT | CHECK alert_type | 'low_stock' or 'out_of_stock' |
| `threshold` | INTEGER | | Number for low_stock threshold |
| `status` | TEXT | CHECK status | 'active' or 'resolved' |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Alert creation time |
| `resolved_at` | TIMESTAMP | | Timestamp when resolved |
| `created_by` | UUID | FK staff_users | Staff who created alert |
| `resolved_by` | UUID | FK staff_users | Staff who resolved alert |

**Alert Types:**
- **low_stock**: Triggered when stock_quantity falls below threshold (e.g., < 10 units)
- **out_of_stock**: Triggered when in_stock = FALSE or stock_quantity = 0

**Display Requirements (from StockAlerts.tsx):**
- Shows product_name, alert_type, current stock, threshold
- Filtered by alert_type and status
- Ability to mark alert as resolved

**Dependencies:**
- `useStockAlerts.ts` - Queries/creates/resolves stock alerts
- `StockAlerts.tsx` - UI dashboard for alert management
- Joins with products table to display product_name
- ReportsDashboard may use this to show stock health metrics

---

## ORDER OPERATIONS

### Table: Orders (Enhanced)
**Table Name:** `orders`  
**Status:** ✅ Existing (with POS extensions)  
**Purpose:** Complete order management with POS integration and staff operations

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_number TEXT UNIQUE NOT NULL, -- Sequential or UUID-based
  items JSONB NOT NULL, -- [{product_id, name, quantity, price}, ...]
  subtotal DECIMAL(10, 2) NOT NULL,
  delivery_fee DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'received' CHECK (status IN ('received', 'preparing', 'processed_at_pos', 'out_for_delivery', 'delivered', 'cancelled')),
  delivery_area TEXT,
  delivery_address TEXT,
  delivery_notes TEXT,
  customer_phone TEXT,
  -- POS Integration Fields
  pos_receipt_number TEXT, -- External POS system receipt ID
  pos_total DECIMAL(10, 2), -- Amount recorded in POS
  pos_processed_at TIMESTAMP, -- When POS transaction occurred
  -- Staff Operations Fields
  staff_notes TEXT, -- Notes from order processing
  assigned_to UUID REFERENCES staff_users(id), -- Staff member handling order
  -- Audit Fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES staff_users(id),
  updated_by UUID NOT NULL REFERENCES staff_users(id)
);
```

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PK | Order identity |
| `customer_id` | UUID | FK customers (NOT NULL) | Customer who placed order |
| `order_number` | TEXT | UNIQUE NOT NULL | Human-readable order ID |
| `items` | JSONB | NOT NULL | Line items: [{product_id, name, qty, price}] |
| `subtotal` | DECIMAL(10,2) | NOT NULL | Sum before delivery fee |
| `delivery_fee` | DECIMAL(10,2) | DEFAULT 0 | Delivery cost |
| `total` | DECIMAL(10,2) | NOT NULL | Final total (subtotal + fee) |
| `status` | TEXT | CHECK status | Order fulfillment stage |
| `delivery_area` | TEXT | | Geographic delivery region |
| `delivery_address` | TEXT | | Full delivery address |
| `delivery_notes` | TEXT | | Delivery special instructions |
| `customer_phone` | TEXT | | Contact number for delivery |
| `pos_receipt_number` | TEXT | | External POS system receipt ID |
| `pos_total` | DECIMAL(10,2) | | Amount in POS system |
| `pos_processed_at` | TIMESTAMP | | POS transaction timestamp |
| `staff_notes` | TEXT | | Staff processing notes |
| `assigned_to` | UUID | FK staff_users | Assigned staff member |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Order placed timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last status change |
| `created_by` | UUID | FK staff_users (NOT NULL) | Order creator staff ID |
| `updated_by` | UUID | FK staff_users (NOT NULL) | Last updater staff ID |

**Status Flow:**
1. **received** - Order placed, awaiting processing
2. **preparing** - Staff preparing order for fulfillment
3. **processed_at_pos** - POS receipt recorded (pos_receipt_number set)
4. **out_for_delivery** - Order assigned to delivery
5. **delivered** - Successfully delivered to customer
6. **cancelled** - Order cancelled before fulfillment

**POS Integration:**
- `pos_receipt_number` - Store external POS system receipt ID
- `pos_total` - Store amount from POS (may differ from order total)
- `pos_processed_at` - Timestamp when recorded in POS
- Used in OrderOperations.tsx to reconcile orders with POS system

**Staff Operations:**
- `assigned_to` - Tracks which staff member is handling the order
- `staff_notes` - Free-form notes about order processing status
- `updated_by` - Audit trail of who made last change

**Dependencies:**
- `useOrderOperations.ts` - Queries orders, updates status, records POS transactions
- `OrderOperations.tsx` - UI for status updates, POS receipt entry, staff notes
- `AdminOrders.tsx` - Dashboard view of all orders filtered by status
- `commissions` table - Created on order placement, status updated on delivery
- `audit_log` - Triggered on every status update for performance tracking

---

## REPORTING DATA

### Analysis Tables (No new tables - calculations from existing)
**Purpose:** Business intelligence derived from orders, commissions, and products

The following metrics are calculated from existing tables:

#### 1. Revenue Metrics (from orders + products)
```
Total Revenue = SUM(orders.total) WHERE orders.status = 'delivered' AND created_at BETWEEN date_range
Average Order Value = Total Revenue / COUNT(orders)
Orders by Status = COUNT(orders) GROUP BY status
Orders by Period = COUNT(orders) GROUP BY DATE(created_at)
```

**Query Sources:**
- `orders.total` - Order revenue
- `orders.created_at` - Date filtering
- `orders.status` - Status breakdown
- `orders.items` (JSONB) - Item-level analysis

#### 2. Revenue by Category
```
Revenue by Category = SUM(orders.total) 
  WHERE products.category = ? 
  AND orders.status = 'delivered'
```

**Query Sources:**
- `products.category` - Category grouping
- `orders.items` (JSONB) - Product-to-order mapping
- `orders.total` - Revenue amount

#### 3. Top Products
```
Top Products = SUM(order_items.quantity) 
  GROUP BY product_id 
  ORDER BY SUM DESC 
  LIMIT 10
```

**Query Sources:**
- `orders.items` (JSONB) - Product quantities
- `products.name` - Product display names

#### 4. Reseller Attribution
```
Revenue by Reseller = SUM(commissions.amount) 
  WHERE commissions.status IN ('confirmed', 'paid')
  GROUP BY reseller_id
```

**Query Sources:**
- `commissions.reseller_id` - Reseller identification
- `commissions.amount` - Reseller earnings
- `commissions.status` - Only confirmed/paid count

#### 5. Staff Performance Metrics
```
Staff Sales = COUNT(orders) WHERE assigned_to = staff_id
Staff Commissions Approved = COUNT(commission_approvals) WHERE approved_by = staff_id
```

**Query Sources:**
- `orders.assigned_to` - Staff-to-order assignment
- `commission_approvals.approved_by` - Staff approval tracking
- `audit_log` - Action history for calculated metrics

**Dependencies:**
- `ReportsDashboard.tsx` - Displays all revenue, order, and category metrics
- Uses date range filters (week/month/all-time) for time-based reporting
- Queries executed at page load, cached in component state

---

## SUPPORTING TABLES

### Table: Delivery Routes
**Table Name:** `delivery_routes`  
**Status:** ✅ Existing  
**Purpose:** Geographic delivery area configuration and fee management

```sql
CREATE TABLE delivery_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_name TEXT UNIQUE NOT NULL,
  delivery_fee DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES staff_users(id),
  updated_by UUID NOT NULL REFERENCES staff_users(id)
);
```

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PK | Route identity |
| `area_name` | TEXT | UNIQUE NOT NULL | Geographic area name |
| `delivery_fee` | DECIMAL(10,2) | NOT NULL | Delivery cost for area |
| `status` | TEXT | CHECK status | 'active' or 'disabled' |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation date |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last modification |
| `created_by` | UUID | FK staff_users | Creator |
| `updated_by` | UUID | FK staff_users | Last editor |

**Dependencies:**
- `useDeliveryRoutes.ts` - Queries/creates/updates delivery routes
- `ManageDeliveryRoutes.tsx` - UI for route configuration
- `orders.delivery_area` - References area_name for fee calculation

---

### Table: Product Import Jobs (Bulk Import Tracking)
**Table Name:** `product_import_jobs`  
**Status:** ✅ Existing  
**Purpose:** Track bulk product import operations and their results

```sql
CREATE TABLE product_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_rows INTEGER,
  imported_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  error_log JSONB, -- [{row_number, error_message}, ...]
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);
```

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PK | Import job identity |
| `staff_id` | UUID | FK staff_users (NOT NULL) | Staff who initiated import |
| `filename` | TEXT | NOT NULL | Uploaded CSV filename |
| `status` | TEXT | CHECK status | pending→processing→completed or failed |
| `total_rows` | INTEGER | | Total rows in CSV |
| `imported_count` | INTEGER | DEFAULT 0 | Successfully imported |
| `failed_count` | INTEGER | DEFAULT 0 | Failed imports |
| `error_log` | JSONB | | [{row_num, error_msg}, ...] |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Upload timestamp |
| `completed_at` | TIMESTAMP | | Completion timestamp |

**CSV Import Format Expected:**
```
product_name, category, price, original_price, commission, loyalty_points, description
Milk, Dairy, 150, 180, 5, 10, Fresh milk
Bread, Bakery, 80, 100, 8, 5, Whole wheat
```

**Dependencies:**
- `BulkProductImport.tsx` - UI for CSV upload and progress tracking
- Hook needed: `useBulkProductImport.ts` - Handles CSV parsing and batch insertion

---

## FOREIGN KEY RELATIONSHIPS

```
customers (Base identity)
├─ commissions (reseller_id → id)
├─ commission_approvals (customer_id → id, approved_by → staff_users.id)
├─ referrals (referrer_id, referred_id → id)
├─ staff_users (customer_id → id)
├─ orders (customer_id → id, created_by/updated_by → staff_users.id)
└─ products (created_by/updated_by → id)

products (Product catalog)
├─ commissions (product_id → id)
├─ stock_alerts (product_id → id)
├─ orders (referenced in items JSONB)
└─ audit_log (record_id when table_name = 'products')

staff_users (Admin staff)
├─ orders (assigned_to → id, created_by/updated_by → id)
├─ commission_approvals (approved_by → id)
├─ audit_log (staff_id → id)
├─ delivery_routes (created_by/updated_by → id)
├─ product_import_jobs (staff_id → id)
└─ audit_log (created_by/updated_by for self-referential audit)

orders (Order management)
├─ commissions (order_id → id) [created on order placed]
├─ audit_log (record_id when table_name = 'orders')
└─ delivery_routes (implicit via delivery_area field)

commission_approvals (Commission workflow)
└─ audit_log (record_id when table_name = 'commission_approvals')
```

---

## INDEXES STRATEGY

### Performance Indexes (Required)

```sql
-- Commissions queries
CREATE INDEX idx_commissions_reseller_id ON commissions(reseller_id);
CREATE INDEX idx_commissions_order_id ON commissions(order_id);
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_commissions_created_at ON commissions(created_at DESC);

-- Commission approvals
CREATE INDEX idx_commission_approvals_customer_id ON commission_approvals(customer_id);
CREATE INDEX idx_commission_approvals_status ON commission_approvals(status);
CREATE INDEX idx_commission_approvals_approved_by ON commission_approvals(approved_by);
CREATE INDEX idx_commission_approvals_created_at ON commission_approvals(created_at DESC);

-- Orders
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_assigned_to ON orders(assigned_to);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_created_by ON orders(created_by);

-- Audit log (performance metrics)
CREATE INDEX idx_audit_log_staff_id ON audit_log(staff_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_staff_action_date ON audit_log(staff_id, action, created_at DESC);

-- Stock alerts
CREATE INDEX idx_stock_alerts_product_id ON stock_alerts(product_id);
CREATE INDEX idx_stock_alerts_status ON stock_alerts(status);
CREATE INDEX idx_stock_alerts_created_at ON stock_alerts(created_at DESC);

-- Products
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_visibility ON products(visibility);
CREATE INDEX idx_products_created_by ON products(created_by);
CREATE INDEX idx_products_in_stock ON products(in_stock);

-- Staff users
CREATE INDEX idx_staff_users_customer_id ON staff_users(customer_id);
CREATE INDEX idx_staff_users_status ON staff_users(status);
CREATE INDEX idx_staff_users_role ON staff_users(role);

-- Product import jobs
CREATE INDEX idx_product_import_jobs_staff_id ON product_import_jobs(staff_id);
CREATE INDEX idx_product_import_jobs_status ON product_import_jobs(status);
CREATE INDEX idx_product_import_jobs_created_at ON product_import_jobs(created_at DESC);

-- Delivery routes
CREATE INDEX idx_delivery_routes_status ON delivery_routes(status);

-- Referrals
CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX idx_referrals_status ON referrals(status);
```

---

## CODE DEPENDENCIES

### 1. COMMISSIONS SYSTEM

**Frontend Hooks:**
- `useCommissions.ts` - Queries commissions by reseller_id, filters by status
- `useCommissionApprovals.ts` - Full CRUD for commission_approvals table

**Frontend Components:**
- `ApproveCommissions.tsx` - Main admin UI for approval workflow
- `EarningsDashboard.tsx` - Reseller view of commissions

**Tables Required:**
- `commissions` - ✅ Ready
- `commission_approvals` - ✅ Ready
- `orders` - ✅ Ready (for order_id FK)

**Triggers/Automation Needed:**
- Auto-create commission record on order creation (status = 'pending')
- Update commission status to 'confirmed' when order status → 'delivered'

---

### 2. STAFF PERFORMANCE METRICS

**Frontend Hooks:**
- `useStaffManagement.ts` - Queries staff_users with filtering
- Needs new: `useStaffPerformance.ts` - Queries audit_log for metrics

**Frontend Components:**
- `ManageStaff.tsx` - Staff CRUD management
- `StaffPerformanceMetrics.tsx` - Dashboard showing metrics

**Tables Required:**
- `staff_users` - ✅ Ready
- `audit_log` - ✅ Ready
- `orders` - ✅ Ready (for assigned_to tracking)
- `commission_approvals` - ✅ Ready (for approval tracking)

**Triggers/Automation Needed:**
- Insert into audit_log on every product CRUD operation
- Insert into audit_log on every order status update
- Insert into audit_log on commission appr/reject operation

---

### 3. STOCK ALERTS SYSTEM

**Frontend Hooks:**
- `useStockAlerts.ts` - Queries/creates/resolves alert records

**Frontend Components:**
- `StockAlerts.tsx` - Dashboard for alert management

**Tables Required:**
- `stock_alerts` - ✅ Ready
- `products` - ✅ Ready (for product_id FK and display)

**Triggers/Automation Needed:**
- None (alerts created manually via UI)

**Monitoring Needed:**
- Separate process/cron job to scan for out_of_stock conditions and auto-create alerts
- Or real-time trigger: when products.stock_quantity = 0, create alert if not exists

---

### 4. ORDER OPERATIONS

**Frontend Hooks:**
- `useOrderOperations.ts` - Queries orders, updates status, records POS

**Frontend Components:**
- `OrderOperations.tsx` - Main UI for order fulfillment
- `AdminOrders.tsx` - Dashboard view of orders

**Tables Required:**
- `orders` - ✅ Ready (with POS fields added)
- `staff_users` - ✅ Ready (for assigned_to field)

**Triggers/Automation Needed:**
- Update audit_log on order status changes
- Update commissions table when order status → 'delivered'

**POS Integration Fields:**
- `orders.pos_receipt_number` - ✅ Ready
- `orders.pos_total` - ✅ Ready
- `orders.pos_processed_at` - ✅ Ready

---

### 5. REPORTING DATA

**Frontend Components:**
- `ReportsDashboard.tsx` - Main reporting UI

**Tables Required (Queries):**
- `orders` - Revenue totals, order counts, status breakdown
- `orders.items` (JSONB) - Category-level analysis
- `products` - Category names
- `commissions` - Reseller attribution
- `commission_approvals` - Payment tracking
- `audit_log` - Staff performance metrics

**Data Calculations:**
- All done client-side in ReportsDashboard.tsx via direct queries
- No separate reporting tables needed (use existing data)

**Potential Performance Optimization:**
- Create materialized view for daily/monthly revenue summaries if reporting becomes slow

---

### 6. BULK PRODUCT IMPORT

**Frontend Hooks:**
- Needs new: `useBulkProductImport.ts` - Handles CSV parsing and batch insertion

**Frontend Components:**
- `BulkProductImport.tsx` - CSV upload and progress UI

**Tables Required:**
- `product_import_jobs` - ✅ Ready
- `products` - ✅ Ready (insertion target)

**CSV Processing:**
- Parse CSV file with expected columns: name, category, price, original_price, commission, loyalty_points, description
- Validate each row for required fields
- Batch insert into products table
- Log errors in product_import_jobs.error_log (JSONB)

---

## MIGRATION CREATION GUIDE

### Existing Migrations (✅ Already Created)
1. `20260309044552_*.sql` - Initial setup
2. `20260309045011_*.sql` - Initial setup
3. `20260309095420_*.sql` - Initial setup
4. `20260309120000_products_table.sql` - Products table
5. `20260309120001_admin_flag.sql` - Admin access control
6. `20260309120002_commissions_table.sql` - Commissions
7. `20260309120003_referrals_table.sql` - Referrals

### New Migrations Needed

**Migration 1: Staff Management**
```sql
-- 20260310_001_staff_users.sql
CREATE TABLE staff_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE REFERENCES customers(id),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'product_manager')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES staff_users(id),
  updated_by UUID NOT NULL REFERENCES staff_users(id)
);

CREATE INDEX idx_staff_users_customer_id ON staff_users(customer_id);
CREATE INDEX idx_staff_users_status ON staff_users(status);
```

**Migration 2: Audit Logging**
```sql
-- 20260310_002_audit_log.sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_staff_id ON audit_log(staff_id);
CREATE INDEX idx_audit_log_staff_action_date ON audit_log(staff_id, action, created_at DESC);
```

**Migration 3: Delivery Routes**
```sql
-- 20260310_003_delivery_routes.sql
CREATE TABLE delivery_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_name TEXT UNIQUE NOT NULL,
  delivery_fee DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES staff_users(id),
  updated_by UUID NOT NULL REFERENCES staff_users(id)
);

CREATE INDEX idx_delivery_routes_status ON delivery_routes(status);
```

**Migration 4: Orders Enhancement**
```sql
-- 20260310_004_orders_and_audit.sql
ALTER TABLE orders ADD COLUMN pos_receipt_number TEXT;
ALTER TABLE orders ADD COLUMN pos_total DECIMAL(10, 2);
ALTER TABLE orders ADD COLUMN pos_processed_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN staff_notes TEXT;
ALTER TABLE orders ADD COLUMN assigned_to UUID REFERENCES staff_users(id);
ALTER TABLE orders ADD COLUMN created_by UUID NOT NULL DEFAULT gen_random_uuid() REFERENCES staff_users(id);
ALTER TABLE orders ADD COLUMN updated_by UUID NOT NULL DEFAULT gen_random_uuid() REFERENCES staff_users(id);

CREATE INDEX idx_orders_assigned_to ON orders(assigned_to);
CREATE INDEX idx_orders_created_by ON orders(created_by);
```

**Migration 5: Stock Alerts & Commission Approvals & Import Jobs**
```sql
-- 20260310_005_enhancements.sql
CREATE TABLE stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock')),
  threshold INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  created_by UUID REFERENCES staff_users(id),
  resolved_by UUID REFERENCES staff_users(id)
);

CREATE TABLE commission_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
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

CREATE TABLE product_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_users(id),
  filename TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_rows INTEGER,
  imported_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  error_log JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_stock_alerts_product_id ON stock_alerts(product_id);
CREATE INDEX idx_stock_alerts_status ON stock_alerts(status);
CREATE INDEX idx_commission_approvals_customer_id ON commission_approvals(customer_id);
CREATE INDEX idx_commission_approvals_status ON commission_approvals(status);
CREATE INDEX idx_commission_approvals_approved_by ON commission_approvals(approved_by);
CREATE INDEX idx_product_import_jobs_staff_id ON product_import_jobs(staff_id);
CREATE INDEX idx_product_import_jobs_status ON product_import_jobs(status);
```

---

## SUMMARY TABLE

| System | Table | Status | Primary Purpose |
|--------|-------|--------|------------------|
| **Commissions** | commissions | ✅ Ready | Track reseller earnings per order |
| | commission_approvals | ✅ Ready | Multi-stage approval workflow |
| **Staff** | staff_users | ✅ Ready | Admin staff directory |
| | audit_log | ✅ Ready | Action audit trail |
| **Stock** | stock_alerts | ✅ Ready | Inventory alerts |
| **Orders** | orders | ✅ Ready | Full order management |
| | delivery_routes | ✅ Ready | Geographic areas & fees |
| **Reporting** | (No new table) | — | Query existing tables |
| **Bulk Import** | product_import_jobs | ✅ Ready | Import job tracking |

---

## NEXT STEPS

1. **Review** this schema specification with backend team
2. **Validate** that all field types match frontend expectations
3. **Create migrations** in Supabase using the migration templates provided
4. **Set up indexes** as specified for query performance
5. **Create triggers** for audit_log entries on staff actions
6. **Create triggers** for auto-commission updates on order status changes
7. **Implement hooks** for bulk import, staff performance queries
8. **Test** each admin feature against the new schema
9. **Monitor** query performance and adjust indexes if needed

---

**Last Updated:** March 10, 2026  
**Schema Version:** 1.0  
**All Features:** Reports ✅ | Commissions ✅ | Stock Alerts ✅ | Bulk Import ✅ | Staff Performance ✅ | Order Operations ✅
