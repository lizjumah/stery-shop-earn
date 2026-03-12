-- Referrals — tracks who referred whom and the bonus status
CREATE TABLE public.referrals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  referred_id     uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  referred_phone  text,
  referred_name   text,
  bonus_amount    numeric DEFAULT 150,
  status          text DEFAULT 'pending', -- pending | completed
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read referrals"
  ON public.referrals FOR SELECT USING (true);

CREATE POLICY "Anyone can create referrals"
  ON public.referrals FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update referrals"
  ON public.referrals FOR UPDATE USING (true);

CREATE INDEX idx_referrals_referrer ON public.referrals (referrer_id);

-- Store referral_code on customer for fast lookup
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- Backfill referral codes for existing customers (last 6 chars of phone, uppercased)
UPDATE public.customers
  SET referral_code = upper(right(replace(phone, ' ', ''), 6))
  WHERE referral_code IS NULL;
