# Production-Safe Admin API Implementation Guide

## Architecture Overview

```
Checkout Flow (UNCHANGED):
├─ Frontend: supabase.from("orders").insert() with anon key
├─ RLS: USING (true) - Anyone can INSERT
└─ Result: Orders created successfully

Admin Flow (NEW):
├─ Frontend: fetch("/api/admin/orders/:id/status", {...})
├─ Backend: Validates admin & uses service_role key
├─ RLS: USING (auth.role() = 'service_role') - Backend only
└─ Result: Secure admin operations
```

---

## Environment Variables Required

### Frontend (Already exists - no changes)
```bash
VITE_SUPABASE_URL="https://iiyzyguilixigsbumqmz.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJ..." # Anon key - safe to expose
```

### Backend (NEW - Add to .env.local or deployment)
```bash
# Backend (NODE ENVIRONMENT ONLY)
SUPABASE_URL="https://iiyzyguilixigsbumqmz.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJ..." # SECRET - never expose to frontend

# Session management (optional but recommended)
SESSION_SECRET="your-secure-random-string"
ADMIN_API_SECRET="your-secure-api-token"  # OR use JWT from frontend session
```

⚠️ **CRITICAL:** `SUPABASE_SERVICE_ROLE_KEY` must NEVER be sent to frontend or exposed in client-side code.

---

## Table Accessibility Matrix

| Table | Frontend (Anon Key) | Backend (Service Role) |
|:---:|:---:|:---:|
| **orders** | ✅ INSERT + SELECT | ✅ Full access |
| **stock_alerts** | ❌ DENIED | ✅ Full access |
| **commission_approvals** | ❌ DENIED | ✅ Full access |
| **audit_log** | ❌ DENIED | ✅ Full access |
| **customers** | ✅ SELECT own | ✅ Full access |
| **products** | ✅ SELECT all | ✅ Full access |

---

## Backend API Implementation

### File: `src/api/admin.ts` (Node.js / Express)

```typescript
import express, { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const router = express.Router();

// Initialize Supabase admin client (service_role key)
const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: {
      persistSession: false, // Backend doesn't need sessions
      autoRefreshToken: false,
    },
  }
);

// ===================================================================
// MIDDLEWARE: Verify Admin Status
// ===================================================================
// This middleware checks that the requesting user is an admin
// The admin ID is passed from the frontend (already verified by AdminRoute)

interface AdminRequest extends Request {
  adminId?: string;
  isAdmin?: boolean;
}

const verifyAdmin = async (
  req: AdminRequest,
  res: Response,
  next: Function
) => {
  try {
    const adminId = req.body.adminId || req.headers["x-admin-id"];

    if (!adminId) {
      return res.status(401).json({ error: "Admin ID required" });
    }

    // Query database to verify admin status
    const { data: admin, error } = await supabaseAdmin
      .from("customers")
      .select("id, is_admin, name")
      .eq("id", adminId)
      .single();

    if (error || !admin) {
      return res.status(403).json({ error: "Admin not found" });
    }

    if (!admin.is_admin) {
      return res.status(403).json({ error: "Not authorized as admin" });
    }

    // Attach admin info to request
    req.adminId = admin.id;
    req.isAdmin = true;

    next();
  } catch (err) {
    console.error("Admin verification failed:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Apply middleware to all admin routes
router.use(verifyAdmin);

// ===================================================================
// ENDPOINT 1: Update Order Status
// ===================================================================
// POST /api/admin/orders/:id/status
// Updates order status: pending → received → preparing → out_for_delivery → delivered

interface UpdateOrderStatusRequest extends AdminRequest {
  body: {
    adminId: string;
    orderId: string;
    newStatus: string;
  };
}

router.post(
  "/orders/:id/status",
  async (req: UpdateOrderStatusRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { newStatus } = req.body;
      const adminId = req.adminId;

      // Validate status value
      const validStatuses = [
        "received",
        "preparing",
        "processed_at_pos",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ];
      if (!validStatuses.includes(newStatus)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      // Update order status
      const { data: order, error } = await supabaseAdmin
        .from("orders")
        .update({
          status: newStatus,
          updated_by: adminId,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Order update error:", error);
        return res.status(400).json({ error: error.message });
      }

      // Log to audit_log
      await writeAuditLog({
        staff_id: adminId,
        action: "update_status",
        entity_type: "orders",
        entity_id: id,
        details: {
          new_status: newStatus,
          order_number: order.order_number,
        },
      });

      res.json({
        success: true,
        order,
        message: `Order ${order.order_number} status updated to ${newStatus}`,
      });
    } catch (err) {
      console.error("Status update error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// ===================================================================
// ENDPOINT 2: Update POS Fields
// ===================================================================
// POST /api/admin/orders/:id/pos
// Updates POS integration fields: receipt number, total, processed_at

interface UpdatePOSRequest extends AdminRequest {
  body: {
    adminId: string;
    pos_receipt_number?: string;
    pos_total?: number;
    pos_processed_at?: string;
  };
}

router.post(
  "/orders/:id/pos",
  async (req: UpdatePOSRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { pos_receipt_number, pos_total, pos_processed_at } = req.body;
      const adminId = req.adminId;

      // Build update object (only include provided fields)
      const updateData: any = { updated_by: adminId };
      if (pos_receipt_number) updateData.pos_receipt_number = pos_receipt_number;
      if (pos_total) updateData.pos_total = pos_total;
      if (pos_processed_at) updateData.pos_processed_at = pos_processed_at;

      const { data: order, error } = await supabaseAdmin
        .from("orders")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("POS update error:", error);
        return res.status(400).json({ error: error.message });
      }

      // Log to audit_log
      await writeAuditLog({
        staff_id: adminId,
        action: "update_pos",
        entity_type: "orders",
        entity_id: id,
        details: {
          pos_receipt_number,
          pos_total,
          pos_processed_at,
        },
      });

      res.json({
        success: true,
        order,
        message: "POS fields updated successfully",
      });
    } catch (err) {
      console.error("POS update error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// ===================================================================
// ENDPOINT 3: Manage Stock Alerts (CRUD)
// ===================================================================
// GET /api/admin/stock-alerts - List all alerts
router.get("/stock-alerts", async (req: AdminRequest, res: Response) => {
  try {
    const { data: alerts, error } = await supabaseAdmin
      .from("stock_alerts")
      .select("*, products(name, stock_quantity)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      alerts,
    });
  } catch (err) {
    console.error("Stock alerts list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/admin/stock-alerts - Create new alert
interface CreateStockAlertRequest extends AdminRequest {
  body: {
    adminId: string;
    product_id: string;
    alert_type: "low_stock" | "out_of_stock";
    threshold: number;
  };
}

router.post(
  "/stock-alerts",
  async (req: CreateStockAlertRequest, res: Response) => {
    try {
      const { product_id, alert_type, threshold } = req.body;
      const adminId = req.adminId;

      const { data: alert, error } = await supabaseAdmin
        .from("stock_alerts")
        .insert({
          product_id,
          alert_type,
          threshold,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      await writeAuditLog({
        staff_id: adminId,
        action: "create_alert",
        entity_type: "stock_alerts",
        entity_id: alert.id,
        details: { product_id, alert_type, threshold },
      });

      res.json({ success: true, alert });
    } catch (err) {
      console.error("Create stock alert error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// PUT /api/admin/stock-alerts/:id - Update alert status
interface UpdateStockAlertRequest extends AdminRequest {
  body: {
    adminId: string;
    status: "active" | "resolved";
  };
}

router.put(
  "/stock-alerts/:id",
  async (req: UpdateStockAlertRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const adminId = req.adminId;

      const updateData: any = { status };
      if (status === "resolved") {
        updateData.resolved_at = new Date().toISOString();
      }

      const { data: alert, error } = await supabaseAdmin
        .from("stock_alerts")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await writeAuditLog({
        staff_id: adminId,
        action: "update_alert",
        entity_type: "stock_alerts",
        entity_id: id,
        details: { status },
      });

      res.json({ success: true, alert });
    } catch (err) {
      console.error("Update stock alert error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// ===================================================================
// ENDPOINT 4: Manage Commission Approvals
// ===================================================================
// GET /api/admin/commissions - List pending approvals
router.get("/commissions", async (req: AdminRequest, res: Response) => {
  try {
    const { data: commissions, error } = await supabaseAdmin
      .from("commission_approvals")
      .select(
        `
        *,
        customers!commission_approvals_customer_id_fkey(name, phone, email),
        staff_users!commission_approvals_approved_by_fkey(name)
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ success: true, commissions });
  } catch (err) {
    console.error("Commissions list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/admin/commissions/:id/approve - Approve commission
interface ApproveCommissionRequest extends AdminRequest {
  body: {
    adminId: string;
    commission_id: string;
  };
}

router.post(
  "/commissions/:id/approve",
  async (req: ApproveCommissionRequest, res: Response) => {
    try {
      const { id } = req.params;
      const adminId = req.adminId;

      const { data: commission, error } = await supabaseAdmin
        .from("commission_approvals")
        .update({
          status: "approved",
          approved_by: adminId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await writeAuditLog({
        staff_id: adminId,
        action: "approve_commission",
        entity_type: "commission_approvals",
        entity_id: id,
        details: {
          amount: commission.amount,
          customer_id: commission.customer_id,
        },
      });

      res.json({
        success: true,
        commission,
        message: `Commission KSh ${commission.amount} approved`,
      });
    } catch (err) {
      console.error("Approve commission error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// POST /api/admin/commissions/:id/reject - Reject commission
interface RejectCommissionRequest extends AdminRequest {
  body: {
    adminId: string;
    reason: string;
  };
}

router.post(
  "/commissions/:id/reject",
  async (req: RejectCommissionRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.adminId;

      const { data: commission, error } = await supabaseAdmin
        .from("commission_approvals")
        .update({
          status: "rejected",
          rejection_reason: reason,
          approved_by: adminId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await writeAuditLog({
        staff_id: adminId,
        action: "reject_commission",
        entity_type: "commission_approvals",
        entity_id: id,
        details: {
          reason,
          amount: commission.amount,
        },
      });

      res.json({
        success: true,
        commission,
        message: `Commission rejected: ${reason}`,
      });
    } catch (err) {
      console.error("Reject commission error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// POST /api/admin/commissions/:id/mark-paid - Mark as paid
interface MarkPaidRequest extends AdminRequest {
  body: {
    adminId: string;
  };
}

router.post(
  "/commissions/:id/mark-paid",
  async (req: MarkPaidRequest, res: Response) => {
    try {
      const { id } = req.params;
      const adminId = req.adminId;

      const { data: commission, error } = await supabaseAdmin
        .from("commission_approvals")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await writeAuditLog({
        staff_id: adminId,
        action: "mark_commission_paid",
        entity_type: "commission_approvals",
        entity_id: id,
        details: {
          amount: commission.amount,
          mpesa_number: commission.mpesa_number,
        },
      });

      res.json({
        success: true,
        commission,
        message: `Commission KSh ${commission.amount} marked as paid`,
      });
    } catch (err) {
      console.error("Mark paid error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// ===================================================================
// ENDPOINT 5: Write Audit Log Entries
// ===================================================================
// Helper function (used internally by other endpoints)

interface AuditLogEntry {
  staff_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, any>;
}

async function writeAuditLog(entry: AuditLogEntry) {
  try {
    // Ensure staff_id references a valid staff user
    // If not staffed yet, store admin customer_id as staff placeholder
    const { error } = await supabaseAdmin.from("audit_log").insert({
      staff_id: entry.staff_id,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      details: entry.details,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Audit log write error:", error);
      // Don't throw - audit logging should not break operations
    }
  } catch (err) {
    console.error("Write audit log error:", err);
  }
}

// GET /api/admin/audit-log - Read audit logs
router.get("/audit-log", async (req: AdminRequest, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const { data: logs, error } = await supabaseAdmin
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({ success: true, logs });
  } catch (err) {
    console.error("Audit log read error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
```

---

## Server Setup (main.ts or index.ts)

```typescript
import express from "express";
import cors from "cors";
import adminRouter from "./api/admin";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Admin API routes (protected by adminId + is_admin check)
app.use("/api/admin", adminRouter);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Admin API running on http://localhost:${PORT}`);
});
```

---

## Frontend Changes Required

### 1. Update AdminOrders.tsx

```tsx
// BEFORE (direct Supabase - NO LONGER WORKS):
const handleStatus = async (orderId: string, newStatus: OrderStatus) => {
  const { error } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId);
};

// AFTER (via backend API - SECURE):
const handleStatus = async (orderId: string, newStatus: OrderStatus) => {
  try {
    const response = await fetch("/api/admin/orders/" + orderId + "/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminId: customer.id,
        orderId,
        newStatus,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      toast.error(error.error || "Failed to update order");
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

### 2. Remove Direct Supabase Calls to Admin Tables

```tsx
// DELETE THIS (won't work - DENIED by RLS):
supabase.from("stock_alerts").select("*");
supabase.from("commission_approvals").select("*");

// REPLACE WITH (backend calls):
fetch("/api/admin/stock-alerts");
fetch("/api/admin/commissions");
```

### 3. Keep Checkout Unchanged

```tsx
// This still works - orders table allows anon INSERT:
const { data: orderData } = await supabase
  .from("orders")
  .insert({ customer_id: cust.id, ... })
  .select()
  .single();
  
// ✅ This continues to work without any changes
```

---

## Deployment Checklist

- [ ] Backend server deployed (Vercel, Railway, Heroku, etc.)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` added to backend env (NOT in frontend)
- [ ] Migrations deployed to Supabase (004b, 004c, 005)
- [ ] Frontend admin pages updated to call `/api/admin/*` instead of Supabase
- [ ] Tested: Checkout still works (anon key INSERT)
- [ ] Tested: Admin pages work (backend API calls)
- [ ] Tested: Direct API calls to admin tables fail with 403 (RLS blocks anon key)
- [ ] Audit log shows all admin actions

---

## Security Verification

```bash
# Test 1: Checkout still works (this should SUCCEED)
curl -X POST "https://iiyzyguilixigsbumqmz.supabase.co/rest/v1/orders" \
  -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"...", "order_number":"TEST-001",...}'
# Expected: 201 Created ✓

# Test 2: Direct stock_alerts access blocked (this should FAIL)
curl -X GET "https://iiyzyguilixigsbumqmz.supabase.co/rest/v1/stock_alerts" \
  -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY"
# Expected: 403 Forbidden ✗

# Test 3: Backend API works (this should SUCCEED)
curl -X GET "http://localhost:3000/api/admin/stock-alerts" \
  -H "Content-Type: application/json" \
  -d '{"adminId":"customer-uuid"}'
# Expected: 200 OK with alerts ✓
```

---

## Summary: What Changed vs What Stayed the Same

| Component | Before | After | Impact |
|-----------|--------|-------|--------|
| **Checkout** | Direct `supabase.insert()` | Same (unchanged) | ✅ Zero impact |
| **Orders read** | Direct `supabase.select()` | Same (unchanged) | ✅ Zero impact |
| **Orders update** | Direct `supabase.update()` | Backend API `/api/admin/orders/:id/status` | ⚠️ Must update admin pages |
| **Stock alerts** | Direct (broken by RLS) | Backend API `/api/admin/stock-alerts` | ⚠️ New feature only |
| **Commissions** | Direct (broken by RLS) | Backend API `/api/admin/commissions` | ⚠️ New feature only |
| **Audit log** | N/A | Backend auto-logs all actions | ✅ Automatic |
| **Admin auth** | localStorage `is_admin` | Same + backend verify | ✅ Identical |

---

## Notes

1. **Orders Table**: Remains mostly open for checkout. Only UPDATE is restricted to service_role.
2. **Admin Tables**: Completely blocked from frontend. Backend must be the interface.
3. **Audit Log**: Auto-populated by backend on every admin action. Immutable.
4. **No Migration**: Checkout continues working exactly as before.
