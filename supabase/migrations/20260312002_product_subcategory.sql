-- Add subcategory support to products table
-- V1: simple nullable text column — no enum constraint so owner can add new subcategories freely.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory text;

-- Backfill subcategories for existing seeded products
UPDATE public.products SET subcategory = 'Breads'           WHERE name ILIKE '%bread%'   AND subcategory IS NULL;
UPDATE public.products SET subcategory = 'Dairy'            WHERE name ILIKE '%milk%'    AND subcategory IS NULL;
UPDATE public.products SET subcategory = 'Sugar & Salt'     WHERE name ILIKE '%sugar%'   AND subcategory IS NULL;
UPDATE public.products SET subcategory = 'Cooking Oils'     WHERE name ILIKE '%oil%'     AND subcategory IS NULL;
UPDATE public.products SET subcategory = 'Cleaning'         WHERE name ILIKE '%soap%'    AND subcategory IS NULL;
UPDATE public.products SET subcategory = 'Chargers & Cables' WHERE name ILIKE '%charger%' AND subcategory IS NULL;
UPDATE public.products SET subcategory = 'Earphones'        WHERE name ILIKE '%earphone%' AND subcategory IS NULL;
UPDATE public.products SET subcategory = 'Flour & Grains'   WHERE name ILIKE '%flour%'   AND subcategory IS NULL;
UPDATE public.products SET subcategory = 'Flour & Grains'   WHERE name ILIKE '%rice%'    AND subcategory IS NULL;
UPDATE public.products SET subcategory = 'Tea & Coffee'     WHERE name ILIKE '%tea%'     AND subcategory IS NULL;
UPDATE public.products SET subcategory = 'Eggs'             WHERE name ILIKE '%egg%'     AND subcategory IS NULL;
UPDATE public.products SET subcategory = 'Bracelets'        WHERE name ILIKE '%bracelet%' AND subcategory IS NULL;
UPDATE public.products SET subcategory = 'Cookware'         WHERE name ILIKE '%pan%'     AND subcategory IS NULL;
UPDATE public.products SET subcategory = 'Bedding'          WHERE category = 'Baby Items' AND subcategory IS NULL;
