-- MIGRATION 20260310004b: Orders Table Enhancement
-- Purpose: Add POS integration and staff assignment fields to existing orders table
-- Strategy: ALTER TABLE (preserve all existing data)
-- ====================================================================

-- Step 1: Add customer_id column (nullable initially for existing rows)
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE;

-- Step 2: Create new TEXT status column (parallel to existing ENUM)
-- This allows us to migrate data safely without dropping the ENUM column
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS status_text text;

-- Step 3: Migrate status data from ENUM to TEXT
-- Map old status values to new workflow values:
-- pending → received (order received from customer)
-- confirmed → preparing (order being prepared)
-- out_for_delivery → out_for_delivery (no change)
-- delivered → delivered (no change)
UPDATE public.orders 
SET status_text = CASE 
  WHEN status::text = 'pending' THEN 'received'
  WHEN status::text = 'confirmed' THEN 'preparing'
  WHEN status::text = 'out_for_delivery' THEN 'out_for_delivery'
  WHEN status::text = 'delivered' THEN 'delivered'
  ELSE 'received'  -- fallback
END
WHERE status_text IS NULL;

-- Step 4: Drop old ENUM status column and rename new TEXT column
ALTER TABLE public.orders 
  DROP COLUMN IF EXISTS status;

ALTER TABLE public.orders 
  RENAME COLUMN status_text TO status;

-- Step 5: Set sensible defaults for status column
ALTER TABLE public.orders 
  ALTER COLUMN status SET DEFAULT 'received',
  ALTER COLUMN status SET NOT NULL;

-- Step 6: Add CHECK constraint for status values
ALTER TABLE public.orders 
  ADD CONSTRAINT status_check 
  CHECK (status IN ('received', 'preparing', 'processed_at_pos', 'out_for_delivery', 'delivered', 'cancelled'));

-- Step 7: Add POS integration columns
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS pos_receipt_number text,
  ADD COLUMN IF NOT EXISTS pos_total numeric,
  ADD COLUMN IF NOT EXISTS pos_processed_at timestamptz;

-- Step 8: Add staff operations columns
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS staff_notes text,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.staff_users(id) ON DELETE SET NULL;

-- Step 9: Add audit columns
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.staff_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.staff_users(id) ON DELETE SET NULL;

-- Step 10: Create or replace updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE public.update_orders_updated_at();

-- Step 11: Create indexes for new columns (improves query performance)
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON public.orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_pos_receipt ON public.orders(pos_receipt_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON public.orders(created_by);
CREATE INDEX IF NOT EXISTS idx_orders_updated_by ON public.orders(updated_by);

-- Step 12: Update RLS policies (PRODUCTION-SAFE)
-- Strategy: Public checkout (anon), restricted admin updates (service_role)
DROP POLICY IF EXISTS "Anyone can read orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can update orders" ON public.orders;

-- CHECKOUT: Anyone can read orders
-- Frontend: Customers see own orders (app filters by customer_id)
-- Admin: Can read all orders for dashboard
CREATE POLICY "Anyone can read orders"
  ON public.orders FOR SELECT 
  USING (true);

-- CHECKOUT: Anyone can INSERT orders (anon key from checkout)
-- Customers insert directly from Checkout.tsx (anon key)
-- RLS cannot validate customer_id=auth.uid() because auth doesn't exist
-- APP RESPONSIBILITY: Pass correct customer_id during checkout
CREATE POLICY "Anyone can insert orders (checkout)"
  ON public.orders FOR INSERT
  WITH CHECK (true);

-- PRODUCTION SECURITY: Update restricted to service_role only
-- Admin status changes (pending → confirmed → delivered, etc.) via backend API
-- Frontend CANNOT update orders directly
-- Anon key: blocked with 403 Forbidden
-- Service role: allowed (called from backend)
CREATE POLICY "Only backend can update orders"
  ON public.orders FOR UPDATE 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ====================================================================
-- Verification Query (run after migration):
-- SELECT pos_receipt_number, pos_total, pos_processed_at, staff_notes, 
--        assigned_to, created_by, updated_by FROM orders LIMIT 1;
-- Expected: 7 new columns exist
--
-- SELECT COUNT(*) FROM pg_indexes 
-- WHERE tablename = 'orders' AND indexname LIKE 'idx_orders%';
-- Expected: Multiple indexes created
