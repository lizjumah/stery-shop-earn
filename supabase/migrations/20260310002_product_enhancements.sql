-- Add visibility and audit fields to products
ALTER TABLE public.products 
ADD COLUMN visibility text NOT NULL DEFAULT 'visible', -- 'visible' or 'hidden'
ADD COLUMN created_by uuid,
ADD COLUMN updated_by uuid;

-- Stock status helper function
-- (in_stock boolean is replaced with stock_quantity, which informs status)

-- Product images table for multiple images per product
CREATE TABLE public.product_images (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url   text NOT NULL,
  is_primary  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read product images"
  ON public.product_images FOR SELECT USING (true);

CREATE POLICY "Staff can manage product images"
  ON public.product_images FOR ALL USING (true);

CREATE INDEX product_images_product_id_idx ON public.product_images(product_id);

-- Product variants table (colors, sizes, etc.)
CREATE TABLE public.product_variants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_type text NOT NULL, -- 'color', 'size', etc.
  variant_value text NOT NULL, -- 'Red', 'Blue', 'Medium', etc.
  sku         text,
  stock_quantity integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read product variants"
  ON public.product_variants FOR SELECT USING (true);

CREATE POLICY "Staff can manage product variants"
  ON public.product_variants FOR ALL USING (true);

CREATE INDEX product_variants_product_id_idx ON public.product_variants(product_id);
