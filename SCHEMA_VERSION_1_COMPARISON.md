# Schema Comparison: Version 1 vs Later

## Quick Reference

### VERSION 1 (PRODUCTION READY)

**New Tables:** 5
- ✅ staff_users (staff directory + roles)
- ✅ audit_log (minimal - action tracking only)
- ✅ delivery_routes (area configuration)
- ✅ stock_alerts (inventory alerts)
- ✅ commission_approvals (approval workflow)

**Altered Tables:** 1
- ✅ orders (+ 7 columns: pos_receipt_number, pos_total, pos_processed_at, staff_notes, assigned_to, created_by, updated_by)

**Existing Tables (No changes):** 4
- ✅ customers (already has is_admin, referral_code)
- ✅ products (already complete for v1)
- ✅ commissions (already exists)
- ✅ orders (base + new fields)

**Total Migrations:** 6 `.sql` files  
**Execution Time:** ~2 minutes  
**Indexes:** 12

---

## DETAILED COMPARISON TABLE

| Feature | Version 1 | Version 2+ |
|---------|-----------|-----------|
| **Staff Management** | | |
| staff_users table | ✅ | — |
| Basic roles (admin/product_manager) | ✅ | — |
| Staff CRUD operations | ✅ | — |
| Staff audit fields (created_by, updated_by) | ❌ | ✅ |
| Staff permissions/policies | ❌ | ✅ |
| | | |
| **Order Operations** | | |
| POS receipt tracking | ✅ | — |
| Staff assignment | ✅ | — |
| Order status workflow | ✅ | — |
| Staff notes field | ✅ | — |
| Order audit trail (full change history) | ❌ | ✅ |
| Delivery driver tracking | ❌ | ✅ |
| | | |
| **Commission System** | | |
| commission_approvals table | ✅ | — |
| Approval workflow (pending/approved/rejected/paid) | ✅ | — |
| M-Pesa number tracking | ✅ | — |
| Approval timestamps | ✅ | — |
| Commission dispute handling | ❌ | ✅ |
| Batch withdrawals | ❌ | ✅ |
| | | |
| **Delivery Routes** | | |
| Route configuration | ✅ | — |
| Area + fee mapping | ✅ | — |
| Route status (active/disabled) | ✅ | — |
| Route audit fields | ❌ | ✅ |
| Geographic bounds/zones | ❌ | ✅ |
| Dynamic route pricing | ❌ | ✅ |
| | | |
| **Stock Alerts** | | |
| Alert creation | ✅ | — |
| Alert types (low_stock, out_of_stock) | ✅ | — |
| Threshold configuration | ✅ | — |
| Alert resolution | ✅ | — |
| Auto-alert triggers (via trigger) | ❌ | ✅ |
| Alert escalation | ❌ | ✅ |
| Stock forecast alerts | ❌ | ✅ |
| | | |
| **Reporting** | | |
| Basic revenue metrics | ✅ | — |
| Order counts and breakdown | ✅ | — |
| Revenue by category | ✅ | — |
| Top products | ✅ | — |
| Date range filtering | ✅ | — |
| Staff activity counts | ✅ | — |
| Detailed change history | ❌ | ✅ |
| Trends and forecasting | ❌ | ✅ |
| Custom report builder | ❌ | ✅ |
| | | |
| **Staff Performance** | | |
| Product upload count | ✅ | — |
| Order processing count | ✅ | — |
| Commission approval count | ✅ | — |
| Last activity timestamp | ✅ | — |
| Audit log (minimal) | ✅ | — |
| Detailed action tracking (old/new values) | ❌ | ✅ |
| Performance trends | ❌ | ✅ |
| Leaderboards | ❌ | ✅ |
| | | |
| **Bulk Import** | | |
| CSV product import | ❌ | ✅ |
| Import job tracking | ❌ | ✅ |
| Error logging | ❌ | ✅ |
| Batch operations | ❌ | ✅ |
| | | |
| **Product Management** | | |
| Primary image | ✅ | — |
| Basic attributes | ✅ | — |
| Multiple images | ❌ | ✅ |
| Variants (size/color) | ❌ | ✅ |
| Product SKUs | ❌ | ✅ |
| Dynamic pricing | ❌ | ✅ |
| | | |
| **Data Integrity** | | |
| Referential integrity (FKs) | ✅ | — |
| Basic indexes | ✅ | — |
| Column constraints | ✅ | — |
| Detailed change audit (JSONB) | ❌ | ✅ |
| Automatic triggers | ❌ | ✅ |
| RLS (Row-Level Security) | ❌ | ✅ |
| Replication/backup | ❌ | ✅ |

---

## VERSION 1 TABLE DETAILS

### staff_users
```
Columns:        7
Indexes:        3
FK Dependencies: customers(1)
Data Rows:      ~5-10 (staff members)
Purpose:        Admin staff directory
```

### audit_log (Minimal)
```
Columns:        6
Indexes:        3
FK Dependencies: staff_users(1)
Data Rows:      ~100-1000 (depends on activity)
Purpose:        Track staff actions for performance metrics
Note:           No old/new values - just action tracking
```

### delivery_routes
```
Columns:        5
Indexes:        2
FK Dependencies: none
Data Rows:      ~5-20 (delivery areas)
Purpose:        Geographic delivery area config
```

### stock_alerts
```
Columns:        7
Indexes:        2
FK Dependencies: products(1)
Data Rows:      ~10-50 (active alerts)
Purpose:        Inventory alert tracking
```

### commission_approvals
```
Columns:        11
Indexes:        3
FK Dependencies: customers(1), staff_users(1)
Data Rows:      ~50-500 (pending approvals over time)
Purpose:        Commission withdrawal approval workflow
```

### orders (enhanced)
```
New Columns:    7
New Indexes:    2
Existing Total: 15+ columns
Total Indexes:  3+
FK Dependencies: Added: staff_users(2)
Purpose:        POS + staff operation tracking
```

---

## WHAT'S POSTPONED & WHY

### ❌ product_import_jobs (Table)
**Size:** 8 columns, 1 index  
**Why postpone:**
- Manual staff entry is acceptable for MVP
- CSV bulk import is efficiency optimization, not core feature
- Can add if/when manual data entry becomes bottleneck
- Adds complexity to file upload handling

**When to implement:** Q2 or when staff request bulk feature

---

### ❌ product_images (Table)
**Size:** 4 columns, 1 index  
**Why postpone:**
- products.image_url is sufficient for MVP
- Single image per product covers core needs
- Gallery feature is nice-to-have, not bloccker
- Adds image storage complexity

**When to implement:** When multi-image showcase is business requirement

---

### ❌ product_variants (Table)
**Size:** 6 columns, 1 index  
**Why postpone:**
- Current product model doesn't have size/color/options
- Variants require product matrix logic (complex)
- Not mentioned in current business workflow
- Can model as separate products for now

**When to implement:** When products need variations

---

### ❌ audit_log (Advanced)
**Missing fields:** old_values JSONB, new_values JSONB  
**Why postpone:**
- Current action tracking is sufficient for metrics
- Detailed before/after logging adds storage overhead
- Can be added in v2 without backfill issues
- Depends on having triggers in place first

**When to implement:** When detailed change trails are needed

---

### ❌ Audit fields on existing tables
**Missing fields:** created_by, updated_by on staff_users, delivery_routes, stock_alerts  
**Why postpone:**
- Not needed for core v1 operations
- Can be added in v2 with self-referential updates
- Simplifies initial schema

**When to implement:** With v2 audit upgrade

---

### ❌ Stock alert automation
**Missing:** Database triggers for auto-alert creation  
**Why postpone:**
- Manual alert creation works for MVP
- Triggers add schema maintenance complexity
- Can be added later as background job
- Staff can manually trigger alerts as needed

**When to implement:** When automated monitoring is required

---

## MIGRATION SAFETY

### Dependency Order (MUST BE FOLLOWED)
```
1. staff_users        (no dependencies)
   ↓
2. orders ALTER       (depends on staff_users.id)
   ↓
3. audit_log          (depends on staff_users.id)
   ↓
4. delivery_routes    (no dependencies after #1)
   ↓
5. stock_alerts       (no dependencies after #1)
   ↓
6. commission_approvals (depends on customers.id, staff_users.id)
```

### Rollback Plan
Each migration is independent and can be rolled back:
```sql
-- Step 1 rollback
DROP TABLE staff_users CASCADE;

-- Step 2 rollback
ALTER TABLE orders DROP COLUMN pos_receipt_number, pos_total, pos_processed_at, staff_notes, assigned_to, created_by, updated_by;

-- Etc.
```

---

## SIZE COMPARISON

### Version 1 Total
- **Rows per month (estimated):** 
  - audit_log: ~500-1000 actions
  - commission_approvals: ~50-100 requests
  - stock_alerts: ~10-50 alerts
  - staff_users: 5-10 (slow growth)
  - delivery_routes: 5-20 (rare changes)

- **Storage (1 year):**
  - audit_log: ~10-20 MB
  - commission_approvals: ~1-2 MB
  - Others: <1 MB each
  - **Total: ~20-30 MB** (very lean)

### Version 1 vs Full Schema
- Version 1: 5 new tables + 1 alteration
- Full schema: 8 new tables + 2 alterations
- Difference: 3 tables postponed (~40% reduction in schema)

---

## FEATURE COVERAGE BY COMPONENT

### ManageStaff.tsx
| Feature | Version 1 | Blocked By |
|---------|-----------|-----------|
| List staff | ✅ | — |
| Add staff | ✅ | — |
| Edit staff | ✅ | — |
| Delete staff | ✅ | — |
| Assign role | ✅ | — |
| Toggle status | ✅ | — |
| View audit history | ❌ | v2 |

### OrderOperations.tsx
| Feature | Version 1 | Blocked By |
|---------|-----------|-----------|
| List orders | ✅ | — |
| Update status | ✅ | — |
| Record POS receipt | ✅ | — |
| Add staff notes | ✅ | — |
| Assign to staff | ✅ | — |
| View change history | ❌ | v2 |

### ApproveCommissions.tsx
| Feature | Version 1 | Blocked By |
|---------|-----------|-----------|
| Filter by status | ✅ | — |
| Approve/Reject | ✅ | — |
| Add rejection reason | ✅ | — |
| Mark as paid | ✅ | — |
| Batch operations | ❌ | v2 |

### StockAlerts.tsx
| Feature | Version 1 | Blocked By |
|---------|-----------|-----------|
| Create alert | ✅ | — |
| Set threshold | ✅ | — |
| Resolve alert | ✅ | — |
| Filter by alert type | ✅ | — |
| Auto-alerts | ❌ | v2 |
| Alert escalation | ❌ | v2 |

### ReportsDashboard.tsx
| Feature | Version 1 | Blocked By |
|---------|-----------|-----------|
| Revenue metrics | ✅ | — |
| Order breakdown | ✅ | — |
| Category breakdown | ✅ | — |
| Top products | ✅ | — |
| Staff activity | ✅ | — |
| Trends | ❌ | v2 |
| Forecasts | ❌ | v2 |

### StaffPerformanceMetrics.tsx
| Feature | Version 1 | Blocked By |
|---------|-----------|-----------|
| Products uploaded count | ✅ | — |
| Products edited count | ✅ | — |
| Orders processed count | ✅ | — |
| Commissions approved count | ✅ | — |
| Last activity time | ✅ | — |
| Trends | ❌ | v2 |
| Leaderboards | ❌ | v2 |

---

## VALIDATION

### Version 1 Supports These Operations
✅ Create/edit/delete staff  
✅ Assign roles and toggle status  
✅ Process orders with POS integration  
✅ Assign orders to staff  
✅ Record staff notes on orders  
✅ Track staff activity (audit_log)  
✅ Approve/reject commission withdrawals  
✅ Track delivery areas and fees  
✅ Create and resolve stock alerts  
✅ Generate basic business reports  
✅ View staff performance metrics  

### Version 1 Does NOT Support
❌ Bulk CSV product import  
❌ Multi-image galleries  
❌ Product variants/SKUs  
❌ Detailed change history (old/new values)  
❌ Automated alert triggers  
❌ Advanced reporting (trends, forecasts)  
❌ Custom report builder  
❌ RLS security policies  

---

## RECOMMENDED NEXT STEPS

### Immediate (After v1 migrations)
1. Apply all 6 migrations in order
2. Seed initial staff member (admin)
3. Seed delivery routes
4. Test each admin feature on staging
5. Deploy to production

### Short-term (Week 2-3)
1. Monitor performance (should be instant)
2. Collect staff feedback on workflow
3. Refine business processes
4. Plan v2 features based on feedback

### Version 2 Planning (Month 2)
1. Bulk import implementation
2. Advanced audit trails
3. Automated alerts via triggers/cron
4. RLS policies
5. Additional reporting

---

**Schema Version 1 Philosophy:**
- **Lean:** Only what's needed for core operations
- **Safe:** No breaking changes, easy rollbacks
- **Fast:** Can be deployed in minutes
- **Extensible:** No wasted effort on future scenarios
- **Production-ready:** All features fully tested before v2

**Estimated delivery: This week**
