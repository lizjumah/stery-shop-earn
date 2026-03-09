-- Add order_source to orders table
ALTER TABLE public.orders ADD COLUMN order_source TEXT DEFAULT 'app';

-- Create order_items table for normalized item storage
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_per_item NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert order items (guest checkout)
CREATE POLICY "Anyone can create order items"
  ON public.order_items FOR INSERT
  WITH CHECK (true);

-- Allow reading order items
CREATE POLICY "Anyone can read order items"
  ON public.order_items FOR SELECT
  USING (true);

-- Create index for faster lookups by order_id
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);