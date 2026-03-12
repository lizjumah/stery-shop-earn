# Backend API Testing & Deployment Guide

This guide walks through testing the admin backend server locally, in staging, and preparing for production.

---

## Table of Contents

1. [Local Development Testing](#local-development-testing)
2. [Backend Setup](#backend-setup)
3. [Testing Each Endpoint](#testing-each-endpoint)
4. [Integration Testing](#integration-testing)
5. [Deployment](#deployment)
6. [Troubleshooting](#troubleshooting)

---

## Local Development Testing

### Step 1: Install Dependencies

```bash
cd ~/Desktop/VC\ CODE\ APP/stery-shop-earn
npm install
```

This installs both frontend and backend dependencies:
- `express` - REST API server
- `cors` - Cross-origin requests (needed for frontend on :5173 to call backend on :3000)
- `dotenv` - Environment variables
- `@supabase/supabase-js` - Database client
- `tsx` - TypeScript execution for development
- `@types/express`, `@types/cors` - TypeScript definitions

### Step 2: Setup Backend Environment Variables

Create `.env.local` in project root:

```bash
# Copy the template
cp .env.local.backend .env.local

# Edit .env.local and add your Service Role Key:
nano .env.local
```

Fill in these values:

```env
SUPABASE_URL=https://iiyzyguilixigsbumqmz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... [COPY FROM SUPABASE DASHBOARD]
PORT=3000
NODE_ENV=development
```

**⚠️ CRITICAL:** Where to get Service Role Key:
1. Go to: https://app.supabase.com/project/_/settings/api
2. Find **"Service role secret"** (not "anon public")
3. Copy the long key starting with `eyJ...`
4. Paste into `.env.local`

### Step 3: Start Backend Server

```bash
npm run dev:backend
```

Expected output:

```
╔════════════════════════════════════════╗
║ Stery Shop Earn - Admin API Server     ║
╚════════════════════════════════════════╝

✓ Server running on http://localhost:3000
✓ Health check: http://localhost:3000/health
✓ Admin API: http://localhost:3000/api/admin/*

Environment: development
Service Role Key: ✓ Loaded
```

**If you see errors:**
- ✗ Port 3000 already in use? Change with `PORT=3001 npm run dev:backend`
- ✗ Service Role Key missing? Check .env.local is in project root
- ✗ Module not found? Run `npm install` again

### Step 4: Start Frontend Dev Server (New Terminal)

```bash
npm run dev
```

Expected output:

```
VITE v5.4.19 running at:

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

### Step 5: Verify Health Check

```bash
curl http://localhost:3000/health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2025-03-10T15:30:00Z",
  "environment": "development"
}
```

---

## Testing Each Endpoint

### Test Prerequisites

You'll need:
- Backend running on http://localhost:3000
- A customer ID with `is_admin = true` in the database
- Order IDs, product IDs, stock alert IDs, commission IDs (as needed)

**Get your admin customer ID:**

In browser DevTools (on localhost:5173):
```javascript
localStorage.getItem('customer_id')
// Should output: "cust_abc123" or similar
```

### Create Test Admin Customer (If Needed)

If no admin customer exists, create one via Supabase Dashboard:

1. Go to https://app.supabase.com/project/_/editor
2. Click **SQL Editor** → **New Query**
3. Run:

```sql
-- Insert test admin customer
INSERT INTO customers (id, name, email, is_admin)
VALUES (
  'test_admin_' || gen_random_uuid()::text,
  'Test Admin',
  'admin@test.local',
  true
)
RETURNING id, email;
```

4. Copy the returned `id` value
5. Use this ID in testing: `X-Customer-ID: [id]`

---

### Test 1: ORDER STATUS UPDATE

**Endpoint:** `POST /api/admin/orders/:id/status`

**Setup:**
1. Get an order ID from your database
2. Get an admin customer ID

**Using curl:**

```bash
# Set variables
BACKEND_URL="http://localhost:3000"
CUSTOMER_ID="test_admin_abc123"  # Replace with your admin ID
ORDER_ID="ord_123"               # Replace with real order ID

# Make request
curl -X POST "$BACKEND_URL/api/admin/orders/$ORDER_ID/status" \
  -H "Content-Type: application/json" \
  -H "X-Customer-ID: $CUSTOMER_ID" \
  -d '{
    "status": "processing"
  }'
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "message": "Order status updated to processing",
  "order": {
    "id": "ord_123",
    "status": "processing",
    "updated_at": "2025-03-10T15:45:00Z"
  }
}
```

**Verify in Audit Log:**

```bash
# Backend logs should show:
[AUTH] Admin verified: admin@test.local
[ORDER_STATUS] Updated order ord_123 to processing
```

---

### Test 2: STOCK ALERTS - LIST

**Endpoint:** `GET /api/admin/stock-alerts`

```bash
curl "$BACKEND_URL/api/admin/stock-alerts" \
  -H "X-Customer-ID: $CUSTOMER_ID"
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "alerts": [
    {
      "id": "alert_123",
      "product_id": "prod_abc",
      "threshold_quantity": 50,
      "status": "active",
      "created_at": "2025-03-09T10:00:00Z"
    }
  ],
  "count": 1
}
```

---

### Test 3: STOCK ALERTS - CREATE

**Setup:** Get a real `product_id` from your database first.

```bash
curl -X POST "$BACKEND_URL/api/admin/stock-alerts" \
  -H "Content-Type: application/json" \
  -H "X-Customer-ID: $CUSTOMER_ID" \
  -d '{
    "product_id": "prod_abc123",
    "threshold_quantity": 50,
    "status": "active"
  }'
```

**Expected Response (201 Created):**

```json
{
  "success": true,
  "message": "Stock alert created",
  "alert": {
    "id": "alert_456",
    "product_id": "prod_abc123",
    "threshold_quantity": 50,
    "status": "active",
    "created_at": "2025-03-10T15:50:00Z"
  }
}
```

---

### Test 4: COMMISSIONS - LIST

**Endpoint:** `GET /api/admin/commissions`

```bash
curl "$BACKEND_URL/api/admin/commissions" \
  -H "X-Customer-ID: $CUSTOMER_ID"
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "commissions": [
    {
      "id": "comm_123",
      "referrer_id": "cust_ref1",
      "amount": 1000,
      "status": "pending",
      "created_at": "2025-03-08T10:00:00Z"
    }
  ],
  "count": 1,
  "stats": {
    "total": 1,
    "pending": 1,
    "approved": 0,
    "rejected": 0,
    "paid": 0
  }
}
```

---

### Test 5: COMMISSIONS - APPROVE

```bash
COMMISSION_ID="comm_123"  # Replace with real ID

curl -X POST "$BACKEND_URL/api/admin/commissions/$COMMISSION_ID/approve" \
  -H "Content-Type: application/json" \
  -H "X-Customer-ID: $CUSTOMER_ID" \
  -d '{}'
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "message": "Commission approved",
  "commission": {
    "id": "comm_123",
    "status": "approved",
    "reviewed_by_admin_id": "test_admin_abc123",
    "reviewed_at": "2025-03-10T16:00:00Z"
  }
}
```

---

### Test 6: AUDIT LOG - QUERY

```bash
# Get last 10 order status updates
curl "$BACKEND_URL/api/admin/audit-log?action=UPDATE_ORDER_STATUS&limit=10" \
  -H "X-Customer-ID: $CUSTOMER_ID"
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "logs": [
    {
      "id": "log_123",
      "action": "UPDATE_ORDER_STATUS",
      "entity_type": "orders",
      "entity_id": "ord_123",
      "old_values": { "status": "pending" },
      "new_values": { "status": "processing" },
      "performed_by_admin_id": "test_admin_abc123",
      "created_at": "2025-03-10T15:45:00Z"
    }
  ],
  "count": 1,
  "pagination": { "limit": 10, "offset": 0 }
}
```

---

## Error Testing

### Test: Missing X-Customer-ID Header

```bash
curl -X POST "$BACKEND_URL/api/admin/orders/ord_123/status" \
  -H "Content-Type: application/json" \
  -d '{"status": "processing"}'
```

**Expected (401 Unauthorized):**

```json
{
  "error": "Unauthorized",
  "message": "Missing X-Customer-ID header"
}
```

---

### Test: Non-Admin Customer

```bash
# Using a customer ID with is_admin = false
NON_ADMIN_ID="cust_regular_user"

curl -X POST "$BACKEND_URL/api/admin/orders/ord_123/status" \
  -H "Content-Type: application/json" \
  -H "X-Customer-ID: $NON_ADMIN_ID" \
  -d '{"status": "processing"}'
```

**Expected (403 Forbidden):**

```json
{
  "error": "Forbidden",
  "message": "Admin access required"
}
```

Backend also auto-logs to audit_log:
- Action: `UNAUTHORIZED_API_ACCESS`
- Includes: Customer email, endpoint, method

---

### Test: Invalid Status Value

```bash
curl -X POST "$BACKEND_URL/api/admin/orders/ord_123/status" \
  -H "Content-Type: application/json" \
  -H "X-Customer-ID: $CUSTOMER_ID" \
  -d '{"status": "invalid_status"}'
```

**Expected (400 Bad Request):**

```json
{
  "error": "Invalid status",
  "message": "Status must be one of: pending, processing, completed, cancelled"
}
```

---

## Integration Testing

### Scenario 1: Full Order Lifecycle

```bash
# 1. Create order (via checkout - anon key)
# 2. Update order status to "processing"
curl -X POST "$BACKEND_URL/api/admin/orders/{order_id}/status" \
  -H "Content-Type: application/json" \
  -H "X-Customer-ID: $CUSTOMER_ID" \
  -d '{"status": "processing"}'

# 3. Add POS fields
curl -X POST "$BACKEND_URL/api/admin/orders/{order_id}/pos" \
  -H "Content-Type: application/json" \
  -H "X-Customer-ID: $CUSTOMER_ID" \
  -d '{
    "pos_receipt_number": "RCP-2025-001",
    "pos_total": 4500,
    "pos_payment_method": "cash"
  }'

# 4. Mark as completed
curl -X POST "$BACKEND_URL/api/admin/orders/{order_id}/status" \
  -H "Content-Type: application/json" \
  -H "X-Customer-ID: $CUSTOMER_ID" \
  -d '{"status": "completed"}'

# 5. Verify audit trail
curl "$BACKEND_URL/api/admin/audit-log?entity_type=orders&entity_id={order_id}&limit=10" \
  -H "X-Customer-ID: $CUSTOMER_ID"
```

**Expected:** 4 entries in audit_log (3 status changes + 1 POS update)

---

### Scenario 2: Commission Approval Workflow

```bash
# 1. View pending commissions
curl "$BACKEND_URL/api/admin/commissions" \
  -H "X-Customer-ID: $CUSTOMER_ID"

# 2. Approve commission
curl -X POST "$BACKEND_URL/api/admin/commissions/{comm_id}/approve" \
  -H "Content-Type: application/json" \
  -H "X-Customer-ID: $CUSTOMER_ID" \
  -d '{}'

# 3. Mark as paid
curl -X POST "$BACKEND_URL/api/admin/commissions/{comm_id}/mark-paid" \
  -H "Content-Type: application/json" \
  -H "X-Customer-ID: $CUSTOMER_ID" \
  -d '{
    "paid_date": "2025-03-10T17:00:00Z",
    "payment_reference": "BANK_TRF_123"
  }'

# 4. Verify status flow
curl "$BACKEND_URL/api/admin/commissions" \
  -H "X-Customer-ID: $CUSTOMER_ID"
```

**Expected:** Commission status: pending → approved → paid

---

## Frontend Integration Testing

### Step 1: Start both servers

```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend
npm run dev
```

### Step 2: Create useAdminApi hook

Create [src/hooks/useAdminApi.ts](src/hooks/useAdminApi.ts):

```typescript
import { useCallback } from 'react';
import { useToast } from './use-toast';

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:3000';

export function useAdminApi() {
  const { toast } = useToast();
  const customerId = localStorage.getItem('customer_id') || '';

  const call = useCallback(
    async (method: string, endpoint: string, body?: any) => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/admin${endpoint}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-Customer-ID': customerId,
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'API call failed');
        }

        return await response.json();
      } catch (err) {
        toast({
          title: 'Error',
          description: (err as Error).message,
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

### Step 3: Update First Admin Component

Update `src/pages/admin/AdminOrders.tsx`:

```typescript
import { useAdminApi } from '@/hooks/useAdminApi';

export function AdminOrders() {
  const { call } = useAdminApi();

  async function handleUpdateStatus(orderId: string, status: string) {
    try {
      const result = await call('POST', `/orders/${orderId}/status`, { status });
      console.log('Order updated:', result.order);
      // Refresh orders list
    } catch (err) {
      console.error('Failed to update order:', err);
    }
  }

  return (
    // Component JSX using handleUpdateStatus()
  );
}
```

### Step 4: Test in Browser

1. Go to http://localhost:5173
2. Navigate to admin page with orders
3. Click "Update Status" button
4. Verify in network tab:
   - Request to http://localhost:3000/api/admin/orders/...
   - Response status 200
   - X-Customer-ID header present

---

## Deployment

### Option A: Deploy Backend Only (Node.js Server)

**Requirements:**
- Node.js 18+ runtime (Vercel, Railway, Render, Fly.io, etc.)
- Environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT`

**Build:**

```bash
npm run build:backend
# Creates dist/server/index.js
```

**Deploy to Vercel (Recommended):**

1. Ensure `vercel.json` exists in root:

```json
{
  "buildCommand": "npm run build && npm run build:backend",
  "installCommand": "npm install",
  "env": {
    "SUPABASE_URL": "@supabase_url",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase_service_role_key",
    "NODE_ENV": "production"
  }
}
```

2. Connect repository to Vercel
3. Add environment variables in project settings
4. Deploy with `git push`

**Deploy to Railway:**

1. Create new project on Railway
2. Connect GitHub repo
3. Add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NODE_ENV=production`
   - `PORT=3000`
4. Railway auto-deploys on push

**Deploy to Render:**

1. Create new "Web Service"
2. Select Node
3. Build command: `npm run build:backend`
4. Start command: `node dist/server/index.js`
5. Add environment variables
6. Deploy

### Option B: Same-Origin Backend (Recommended for Phase 1)

If frontend and backend are on same domain:

**Frontend (.env):**
```env
VITE_BACKEND_URL=/api
```

**nginx/server config:**
```nginx
# Frontend on /
location / {
  proxy_pass http://frontend:5173;
}

# Backend API on /api
location /api {
  proxy_pass http://backend:3000;
}
```

This eliminates CORS issues.

---

### Option C: Docker Deployment

**Dockerfile (Multi-stage):**

```dockerfile
# Stage 1: Build frontend
FROM node:18 AS frontend-build
WORKDIR /app
COPY . .
RUN npm install && npm run build

# Stage 2: Build backend
FROM node:18 AS backend-build
WORKDIR /app
COPY . .
RUN npm install && npm run build:backend

# Stage 3: Runtime
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY --from=backend-build /app/dist/server ./dist/server
COPY --from=frontend-build /app/dist ./public
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/server/index.js"]
```

**docker-compose.yml:**

```yaml
version: '3'
services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY}
      NODE_ENV: production
```

---

## Production Checklist

Before deploying to production:

- [ ] All environment variables set securely (not in git)
- [ ] `.env.local` added to `.gitignore`
- [ ] Service role key never logged or exposed
- [ ] CORS properly configured for production domain
- [ ] Backend health check working (`/health` endpoint)
- [ ] Frontend `.env` points to production backend URL
- [ ] All admin operations auto-log to audit_log
- [ ] Error handling works (no stack traces in production)
- [ ] Rate limiting implemented (optional but recommended)
- [ ] Monitoring enabled (error tracking, uptime)

---

## Troubleshooting

### Backend won't start

**Error:** `Cannot find module 'express'`

**Solution:**
```bash
npm install
npm run dev:backend
```

---

### CORS errors in browser

**Error:** `Access to XMLHttpRequest from origin 'http://localhost:5173' blocked`

**Solution:**
1. Verify backend running on :3000
2. Check `cors` package installed: `npm list cors`
3. Verify frontend .env has `VITE_BACKEND_URL=http://localhost:3000`

---

### 401 Unauthorized on all requests

**Error:** `"Unauthorized", "message": "Missing X-Customer-ID header"`

**Solution:**
1. Verify customer ID in localStorage:
   ```javascript
   localStorage.getItem('customer_id')
   ```
2. Pass header in all requests:
   ```bash
   -H "X-Customer-ID: {customer_id}"
   ```

---

### 403 Forbidden (not admin)

**Error:** `"Forbidden", "message": "Admin access required"`

**Solution:**
1. Verify customer has `is_admin = true` in database
2. Check with SQL:
   ```sql
   SELECT id, email, is_admin FROM customers WHERE id = '{your_id}';
   ```
3. If not admin, update:
   ```sql
   UPDATE customers SET is_admin = true WHERE id = '{your_id}';
   ```

---

### Service role key not loading

**Error:** `Service Role Key: ✗ Missing` at startup

**Solution:**
1. Verify `.env.local` exists in project root
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set
3. Restart server: `npm run dev:backend`
4. Check Supabase dashboard has value set

---

### Audit log entries not appearing

**Problem:** Admin operations execute but don't log

**Debug:**
```bash
# Query audit log directly
curl "$BACKEND_URL/api/admin/audit-log" \
  -H "X-Customer-ID: $CUSTOMER_ID"

# Check for recent entries
SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10;
```

**Solution:**
1. Verify audit_log table exists: See migrations
2. Verify insert permissions: Service role key should have access
3. Check backend logs for errors during insert

---

## Quick Reference: Common Commands

```bash
# Install dependencies
npm install

# Start backend dev server
npm run dev:backend

# Start frontend dev server
npm run dev

# Build backend for production
npm run build:backend

# Run tests
npm test

# Test health check
curl http://localhost:3000/health

# Test order status endpoint
curl -X POST http://localhost:3000/api/admin/orders/ord_123/status \
  -H "Content-Type: application/json" \
  -H "X-Customer-ID: test_admin_123" \
  -d '{"status": "processing"}'
```

