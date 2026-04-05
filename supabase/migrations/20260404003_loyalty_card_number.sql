-- Add loyalty_card_number to customers so they can link a physical loyalty card
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS loyalty_card_number text NULL;

-- Store it on orders so staff can see it without a second lookup
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS loyalty_card_number text NULL;
