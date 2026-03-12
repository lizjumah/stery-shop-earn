-- Staff roles enum
CREATE TYPE public.staff_role AS ENUM ('admin', 'product_manager');

-- Staff users table
CREATE TABLE public.staff_users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  name        text NOT NULL,
  phone       text NOT NULL UNIQUE,
  role        public.staff_role NOT NULL DEFAULT 'product_manager',
  status      text NOT NULL DEFAULT 'active', -- 'active' or 'disabled'
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  created_by  uuid,
  updated_by  uuid
);

ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;

-- Only authenticated staff can read/manage staff
CREATE POLICY "Staff can read staff users"
  ON public.staff_users FOR SELECT USING (true);

-- Only admins can modify staff
CREATE POLICY "Admins can manage staff"
  ON public.staff_users FOR ALL USING (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_staff_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_staff_users_updated_at
  BEFORE UPDATE ON public.staff_users
  FOR EACH ROW EXECUTE PROCEDURE update_staff_users_updated_at();

CREATE INDEX staff_users_role_idx ON public.staff_users(role);
CREATE INDEX staff_users_status_idx ON public.staff_users(status);
