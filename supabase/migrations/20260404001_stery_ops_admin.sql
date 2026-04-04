-- Create the shared Stery Operations Admin account.
-- Phone: 0794560657 (store WhatsApp +254794560657, normalised to local format).
-- Role: product_manager — can add/edit products, manage orders, upload images.
--       Does NOT have owner privileges (no financial overview, no staff management).
-- PIN: 405019 — 6-digit, plain text (consistent with the staff_pin column convention).

INSERT INTO public.customers (name, phone, role, is_admin, staff_pin)
VALUES (
  'Stery Operations Admin',
  '0794560657',
  'product_manager',
  false,
  '405019'
)
ON CONFLICT (phone) DO UPDATE
  SET
    name      = EXCLUDED.name,
    role      = EXCLUDED.role,
    is_admin  = EXCLUDED.is_admin,
    staff_pin = EXCLUDED.staff_pin;
