# Backend Admin API Documentation

## Overview

This document describes all admin API endpoints available in the Stery Shop Earn backend server. These endpoints handle sensitive operations that require admin privileges.

**Base URL (Development):** `http://localhost:3000/api/admin`  
**Base URL (Staging/Production):** Set via frontend `.env` → `VITE_BACKEND_URL`

---

## Authentication

All admin endpoints require the following header:

```
X-Customer-ID: {customer_id}
```

The backend will verify:
1. Customer exists in the database
2. Customer has `is_admin = true`
3. Auto-log the action to `audit_log` table

**Example:**
```bash
curl -X POST http://localhost:3000/api/admin/orders/123/status \
  -H "Content-Type: application/json" \
  -H "X-Customer-ID: cust_abc123" \
  -d '{"status": "preparing"}'
```

---

## Endpoints

### 1. ORDER STATUS UPDATE

**Endpoint:** `POST /api/admin/orders/:id/status`

**Purpose:** Update order status (received, preparing, processed_at_pos, out_for_delivery, delivered, cancelled)

**Headers:**
```
X-Customer-ID: {customer_id}
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "preparing"
}
```

**Valid Statuses:**
- `received` - Order placed, awaiting preparation
- `preparing` - Being prepared/assembled
- `processed_at_pos` - Processed through Point-of-Sale system
- `out_for_delivery` - Out for delivery
- `delivered` - Successfully delivered
- `cancelled` - Order cancelled

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Order status updated to preparing",
  "order": {
    "id": "ord_123",
    "customer_id": "cust_abc",
    "status": "preparing",
    "total_amount": 4500,
    "created_at": "2025-03-10T12:00:00Z",
    "updated_at": "2025-03-10T14:30:00Z"
  }
}
```

**Error Responses:**
```json
{
  "error": "Invalid status",
  "message": "Status must be one of: received, preparing, processed_at_pos, out_for_delivery, delivered, cancelled"
}
```

**Auto-logged to audit_log:**
- Action: `UPDATE_ORDER_STATUS`
- Entity Type: `orders`
- Old Value: Previous status
- New Value: New status

---

### 2. ORDER POS FIELDS UPDATE

**Endpoint:** `POST /api/admin/orders/:id/pos`

**Purpose:** Update Point-of-Sale (POS) integration fields on an order

**Headers:**
```
X-Customer-ID: {customer_id}
Content-Type: application/json
```

**Request Body (all optional):**
```json
{
  "pos_receipt_number": "RCP-2025-001234",
  "pos_total": 4500,
  "pos_payment_method": "cash",
  "pos_timestamp": "2025-03-10T14:30:00Z"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Order POS fields updated",
  "order": {
    "id": "ord_123",
    "pos_receipt_number": "RCP-2025-001234",
    "pos_total": 4500,
    "pos_payment_method": "cash",
    "pos_timestamp": "2025-03-10T14:30:00Z",
    "updated_at": "2025-03-10T14:30:00Z"
  }
}
```

**Auto-logged to audit_log:**
- Action: `UPDATE_ORDER_POS`
- Entity Type: `orders`
- Old/New Values: POS fields before and after

---

### 3. STOCK ALERTS - LIST

**Endpoint:** `GET /api/admin/stock-alerts`

**Purpose:** Retrieve all active stock alerts

**Headers:**
```
X-Customer-ID: {customer_id}
```

**Query Parameters:** None

**Response (200 OK):**
```json
{
  "success": true,
  "alerts": [
    {
      "id": "alert_123",
      "product_id": "prod_abc",
      "product": {
        "id": "prod_abc",
        "name": "Tomatoes",
        "sku": "TOL-001"
      },
      "threshold_quantity": 50,
      "current_stock": 35,
      "status": "active",
      "assigned_to_admin_id": "cust_admin1",
      "created_at": "2025-03-09T10:00:00Z"
    }
  ],
  "count": 1
}
```

---

### 4. STOCK ALERTS - CREATE

**Endpoint:** `POST /api/admin/stock-alerts`

**Purpose:** Create a new stock alert for a product

**Headers:**
```
X-Customer-ID: {customer_id}
Content-Type: application/json
```

**Request Body:**
```json
{
  "product_id": "prod_abc",
  "threshold_quantity": 50,
  "status": "active",
  "assigned_to_admin_id": "cust_admin2"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Stock alert created",
  "alert": {
    "id": "alert_456",
    "product_id": "prod_abc",
    "threshold_quantity": 50,
    "status": "active",
    "assigned_to_admin_id": "cust_admin2",
    "created_at": "2025-03-10T15:00:00Z"
  }
}
```

**Auto-logged to audit_log:**
- Action: `CREATE_STOCK_ALERT`
- Entity Type: `stock_alerts`
- New Value: Alert details

---

### 5. STOCK ALERTS - UPDATE

**Endpoint:** `PUT /api/admin/stock-alerts/:id`

**Purpose:** Update an existing stock alert

**Headers:**
```
X-Customer-ID: {customer_id}
Content-Type: application/json
```

**Request Body (all optional):**
```json
{
  "status": "resolved",
  "threshold_quantity": 75,
  "assigned_to_admin_id": "cust_admin1"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Stock alert updated",
  "alert": {
    "id": "alert_456",
    "product_id": "prod_abc",
    "threshold_quantity": 75,
    "status": "resolved",
    "assigned_to_admin_id": "cust_admin1",
    "updated_at": "2025-03-10T16:00:00Z"
  }
}
```

**Auto-logged to audit_log:**
- Action: `UPDATE_STOCK_ALERT`
- Entity Type: `stock_alerts`
- Old/New Values: Changed fields

---

### 6. COMMISSIONS - LIST

**Endpoint:** `GET /api/admin/commissions`

**Purpose:** Retrieve all commission approval records with statistics

**Headers:**
```
X-Customer-ID: {customer_id}
```

**Response (200 OK):**
```json
{
  "success": true,
  "commissions": [
    {
      "id": "comm_123",
      "referrer_id": "cust_ref1",
      "referrer": {
        "id": "cust_ref1",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "amount": 1000,
      "status": "pending",
      "reviewed_by_admin_id": null,
      "reviewed_at": null,
      "rejection_reason": null,
      "paid_date": null,
      "payment_reference": null,
      "created_at": "2025-03-08T10:00:00Z"
    }
  ],
  "count": 1,
  "stats": {
    "total": 5,
    "pending": 2,
    "approved": 2,
    "rejected": 1,
    "paid": 0
  }
}
```

---

### 7. COMMISSIONS - APPROVE

**Endpoint:** `POST /api/admin/commissions/:id/approve`

**Purpose:** Approve a commission for payment

**Headers:**
```
X-Customer-ID: {customer_id}
Content-Type: application/json
```

**Request Body:**
```json
{}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Commission approved",
  "commission": {
    "id": "comm_123",
    "referrer_id": "cust_ref1",
    "amount": 1000,
    "status": "approved",
    "reviewed_by_admin_id": "cust_admin1",
    "reviewed_at": "2025-03-10T17:00:00Z",
    "rejection_reason": null
  }
}
```

**Auto-logged to audit_log:**
- Action: `APPROVE_COMMISSION`
- Entity Type: `commission_approvals`
- Status changed to: `approved`

---

### 8. COMMISSIONS - REJECT

**Endpoint:** `POST /api/admin/commissions/:id/reject`

**Purpose:** Reject a commission with reason

**Headers:**
```
X-Customer-ID: {customer_id}
Content-Type: application/json
```

**Request Body:**
```json
{
  "rejection_reason": "Commission amount exceeds referral bonus for this period"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Commission rejected",
  "commission": {
    "id": "comm_123",
    "referrer_id": "cust_ref1",
    "amount": 1000,
    "status": "rejected",
    "reviewed_by_admin_id": "cust_admin1",
    "reviewed_at": "2025-03-10T17:05:00Z",
    "rejection_reason": "Commission amount exceeds referral bonus for this period"
  }
}
```

**Auto-logged to audit_log:**
- Action: `REJECT_COMMISSION`
- Entity Type: `commission_approvals`
- Status changed to: `rejected`

---

### 9. COMMISSIONS - MARK PAID

**Endpoint:** `POST /api/admin/commissions/:id/mark-paid`

**Purpose:** Mark an approved commission as paid

**Headers:**
```
X-Customer-ID: {customer_id}
Content-Type: application/json
```

**Request Body (all optional):**
```json
{
  "paid_date": "2025-03-10T17:10:00Z",
  "payment_reference": "BANK_TRF_123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Commission marked as paid",
  "commission": {
    "id": "comm_123",
    "referrer_id": "cust_ref1",
    "amount": 1000,
    "status": "paid",
    "paid_date": "2025-03-10T17:10:00Z",
    "payment_reference": "BANK_TRF_123456"
  }
}
```

**Auto-logged to audit_log:**
- Action: `MARK_COMMISSION_PAID`
- Entity Type: `commission_approvals`
- Status changed to: `paid`

---

### 10. AUDIT LOG - QUERY

**Endpoint:** `GET /api/admin/audit-log`

**Purpose:** Query audit log for administrative actions with optional filters

**Headers:**
```
X-Customer-ID: {customer_id}
```

**Query Parameters:**
- `action` (optional): Filter by action type (e.g., `UPDATE_ORDER_STATUS`)
- `entity_type` (optional): Filter by entity type (e.g., `orders`)
- `admin_id` (optional): Filter by admin who performed action
- `limit` (optional, default: 50, max: 500): Records per page
- `offset` (optional, default: 0): Starting record number

**Example Request:**
```bash
curl "http://localhost:3000/api/admin/audit-log?action=UPDATE_ORDER_STATUS&limit=10&offset=0" \
  -H "X-Customer-ID: cust_admin1"
```

**Response (200 OK):**
```json
{
  "success": true,
  "logs": [
    {
      "id": "log_123",
      "action": "UPDATE_ORDER_STATUS",
      "entity_type": "orders",
      "entity_id": "ord_123",
      "old_values": {
        "status": "received"
      },
      "new_values": {
        "status": "preparing"
      },
      "performed_by_admin_id": "cust_admin1",
      "created_at": "2025-03-10T14:30:00Z"
    }
  ],
  "count": 1,
  "pagination": {
    "limit": 50,
    "offset": 0
  }
}
```

---

## Health Check

**Endpoint:** `GET /health`

**Purpose:** Verify backend server is running

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2025-03-10T15:30:00Z",
  "environment": "development"
}
```

---

## Error Handling

All error responses follow this format:

```json
{
  "error": "Error type",
  "message": "Human-readable error description"
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request (invalid data)
- `401`: Unauthorized (missing/invalid X-Customer-ID)
- `403`: Forbidden (not admin)
- `404`: Not Found
- `500`: Server Error

---

## Frontend Integration Example

### React Hook for Admin API Calls

```typescript
// hooks/useAdminApi.ts
import { useCallback } from 'react';
import { useToast } from './use-toast';

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:3000';

export function useAdminApi() {
  const { toast } = useToast();
  const customerId = localStorage.getItem('customer_id');

  const call = useCallback(
    async (method: string, endpoint: string, body?: any) => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/admin${endpoint}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-Customer-ID': customerId || '',
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
          const error = await response.json();
          throw error;
        }

        return await response.json();
      } catch (err) {
        toast({
          title: 'Error',
          description: (err as any).message || 'API call failed',
          variant: 'destructive',
        });
        throw err;
      }
    },
    [customerId, toast]
  );

  return { call };
}
```

### Usage in Component

```typescript
// pages/admin/AdminOrders.tsx
const { call } = useAdminApi();

async function handleStatusChange(orderId: string, newStatus: string) {
  await call('POST', `/orders/${orderId}/status`, { status: newStatus });
}
```

---

## Environment Variables

**Backend (.env.local):**
```
SUPABASE_URL=https://iiyzyguilixigsbumqmz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
PORT=3000
NODE_ENV=development
```

**Frontend (.env):**
```
VITE_BACKEND_URL=http://localhost:3000
```

---

## Security Notes

✓ Service role key used backend-only (never exposed)  
✓ All requests verified with `X-Customer-ID` header  
✓ Admin flag checked against `customers.is_admin`  
✓ All actions auto-logged to `audit_log` table  
✗ Do NOT commit `.env.local` to git  
✗ Do NOT log service role key  
✗ Do NOT pass service role key to frontend

