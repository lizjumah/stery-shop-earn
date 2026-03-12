-- Delivery routes management table
CREATE TABLE public.delivery_routes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_name   text NOT NULL UNIQUE,
  delivery_fee numeric NOT NULL,
  status      text DEFAULT 'active', -- 'active' or 'disabled'
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  created_by  uuid,
  updated_by  uuid
);

ALTER TABLE public.delivery_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active delivery routes"
  ON public.delivery_routes FOR SELECT USING (status = 'active');

CREATE POLICY "Staff can manage delivery routes"
  ON public.delivery_routes FOR ALL USING (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_delivery_routes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_delivery_routes_updated_at
  BEFORE UPDATE ON public.delivery_routes
  FOR EACH ROW EXECUTE PROCEDURE update_delivery_routes_updated_at();

-- Seed default delivery routes
INSERT INTO public.delivery_routes (area_name, delivery_fee, status)
VALUES
  ('Bungoma Town', 100, 'active'),
  ('Kanduyi', 200, 'active'),
  ('Webuye', 250, 'active'),
  ('Chwele', 200, 'active');
