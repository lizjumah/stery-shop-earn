-- product_images: additional gallery images per product.
-- products.image_url remains the primary/cover image and is never touched here.
-- This table is purely additive — existing products are unaffected.
CREATE TABLE IF NOT EXISTS public.product_images (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url   text        NOT NULL,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id
  ON public.product_images(product_id, sort_order);

-- Open RLS policy — access controlled by backend verifyAdmin middleware
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_images_public"
  ON public.product_images FOR ALL
  USING (true) WITH CHECK (true);
