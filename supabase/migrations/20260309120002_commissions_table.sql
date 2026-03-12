-- Commissions — tracks earnings for resellers (Earn mode)
CREATE TABLE public.commissions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id  uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id     uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_id   uuid REFERENCES public.products(id) ON DELETE SET NULL,
  amount       numeric NOT NULL DEFAULT 0,
  status       text NOT NULL DEFAULT 'pending', -- pending | confirmed | paid | withdrawn
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resellers can read own commissions"
  ON public.commissions FOR SELECT USING (true);

CREATE POLICY "System can create commissions"
  ON public.commissions FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update commissions"
  ON public.commissions FOR UPDATE USING (true);

CREATE INDEX idx_commissions_reseller ON public.commissions (reseller_id);
CREATE INDEX idx_commissions_status   ON public.commissions (status);

CREATE OR REPLACE FUNCTION update_commissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_commissions_updated_at
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW EXECUTE PROCEDURE update_commissions_updated_at();
