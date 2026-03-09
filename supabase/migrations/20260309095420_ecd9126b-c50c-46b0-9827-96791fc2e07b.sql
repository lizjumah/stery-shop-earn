
-- Create customers table with phone as unique identifier
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text UNIQUE NOT NULL,
  email text,
  delivery_location text,
  delivery_notes text,
  loyalty_points integer NOT NULL DEFAULT 0,
  birthday text,
  birthday_bonus_claimed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create points_history table
CREATE TABLE public.points_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  label text NOT NULL,
  points integer NOT NULL,
  type text NOT NULL DEFAULT 'earned',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add customer_id to orders table
ALTER TABLE public.orders ADD COLUMN customer_id uuid REFERENCES public.customers(id);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_history ENABLE ROW LEVEL SECURITY;

-- Policies for customers (public access since no auth)
CREATE POLICY "Anyone can read customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Anyone can create customers" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update customers" ON public.customers FOR UPDATE USING (true);

-- Policies for points_history
CREATE POLICY "Anyone can read points_history" ON public.points_history FOR SELECT USING (true);
CREATE POLICY "Anyone can create points_history" ON public.points_history FOR INSERT WITH CHECK (true);

-- Trigger to update updated_at on customers
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
