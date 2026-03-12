-- Products table — replaces hardcoded src/data/products.ts
CREATE TABLE public.products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  price       numeric NOT NULL,
  original_price numeric,
  image_url   text,
  category    text NOT NULL DEFAULT 'Groceries',
  description text,
  commission  numeric DEFAULT 0,
  loyalty_points integer DEFAULT 0,
  in_stock    boolean DEFAULT true,
  stock_quantity integer DEFAULT 100,
  is_offer    boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Public read — everyone can browse the catalog
CREATE POLICY "Anyone can read products"
  ON public.products FOR SELECT USING (true);

-- Admin write — tighten once Supabase Auth is configured
CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL USING (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE PROCEDURE update_products_updated_at();

-- Seed with the 14 existing products
INSERT INTO public.products
  (name, price, original_price, image_url, category, description, commission, loyalty_points, in_stock, stock_quantity, is_offer)
VALUES
  ('Stery Bread',         60,   NULL, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', 'Bakery',       'Fresh baked bread from Stery Bakery. Soft, fluffy and delicious.',                10,  4,  true, 50,  false),
  ('Fresh Milk 500ml',    75,   NULL, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400', 'Groceries',    'Fresh pasteurized milk from local farms. Rich in calcium and vitamins.',           8,  5,  true, 80,  false),
  ('Sugar 1kg',          180,    200, 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400', 'Groceries',    'White refined sugar for tea and baking.',                                         12, 12, true, 100, true),
  ('Cooking Oil 1L',     350,    400, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400', 'Groceries', 'Pure vegetable cooking oil. Ideal for frying and cooking.',                       40, 20, true, 60,  true),
  ('Bar Soap',           120,   NULL, 'https://images.unsplash.com/photo-1600857062241-98e5dba7f214?w=400', 'Household',  'Multipurpose cleaning bar soap. Great for laundry and household use.',            15,  8, true, 200, false),
  ('Phone Charger',      500,    650, 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400', 'Electronics','Fast charging USB cable. Compatible with most Android phones.',                  100, 30, true, 40,  true),
  ('Earphones',          350,   NULL, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', 'Electronics','Comfortable in-ear earphones with clear sound quality and bass.',                  60, 20, true, 35,  false),
  ('Baby Blanket',       800,    950, 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400', 'Baby Items', 'Soft, warm baby blanket. Perfect for newborns and infants.',                    120, 50, true, 25,  true),
  ('Bracelet',          1200,   NULL, 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=400', 'Jewelry',    'Beautiful handmade bracelet. Perfect gift for someone special.',                  200, 60, true, 15,  false),
  ('Cooking Pan',        650,   NULL, 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400', 'Household',    'Non-stick cooking pan. Durable and easy to clean.',                               80, 35, true, 30,  false),
  ('Unga Maize Flour 2kg',220,  250, 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400', 'Groceries',  'Premium maize flour for making ugali. Finely milled for smooth texture.',         15, 15, true, 90,  true),
  ('Tea Leaves 500g',    450,    520, 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400', 'Groceries', 'Premium Kenyan tea leaves. Strong and aromatic.',                                  35, 30, true, 70,  true),
  ('Rice 2kg',           280,   NULL, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', 'Groceries', 'Premium long grain rice. Perfect for pilau and biriyani.',                       18, 18, true, 85,  false),
  ('Eggs Tray (30)',     450,   NULL, 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400', 'Groceries', 'Farm fresh eggs. High in protein.',                                               25, 25, true, 45,  false);
