
-- =========================================
-- ENUMS
-- =========================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.tx_type AS ENUM ('deposit','withdrawal','investment','roi','referral','welcome_bonus','daily_checkin','refund');
CREATE TYPE public.tx_status AS ENUM ('pending','approved','rejected','completed','failed');
CREATE TYPE public.deposit_method AS ENUM ('paystack','manual');
CREATE TYPE public.investment_status AS ENUM ('active','completed','cancelled');
CREATE TYPE public.referral_source AS ENUM ('deposit','investment','roi');

-- =========================================
-- USER ROLES (separate table, security definer)
-- =========================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================
-- SETTINGS (singleton)
-- =========================================
CREATE TABLE public.settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  site_name TEXT NOT NULL DEFAULT 'Horizon',
  welcome_bonus_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  welcome_bonus_withdrawable BOOLEAN NOT NULL DEFAULT false,
  daily_checkin_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  ref_l1_pct NUMERIC(5,2) NOT NULL DEFAULT 10,
  ref_l2_pct NUMERIC(5,2) NOT NULL DEFAULT 3,
  ref_l3_pct NUMERIC(5,2) NOT NULL DEFAULT 1,
  ref_source public.referral_source NOT NULL DEFAULT 'deposit',
  min_withdrawal NUMERIC(14,2) NOT NULL DEFAULT 1000,
  max_withdrawal NUMERIC(14,2) NOT NULL DEFAULT 1000000,
  withdrawal_fee_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  paystack_enabled BOOLEAN NOT NULL DEFAULT true,
  manual_deposit_enabled BOOLEAN NOT NULL DEFAULT true,
  manual_bank_name TEXT NOT NULL DEFAULT '',
  manual_bank_account TEXT NOT NULL DEFAULT '',
  manual_bank_account_name TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.settings (id) VALUES (1);
GRANT SELECT ON public.settings TO anon, authenticated;
GRANT UPDATE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "admins update settings" ON public.settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================
-- PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  username TEXT,
  email TEXT,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  bank_name TEXT,
  bank_account_no TEXT,
  bank_account_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "admins update profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Allow lookup of referral code at signup (anon needs to verify a code exists)
CREATE POLICY "anyone lookup by referral code" ON public.profiles FOR SELECT TO anon USING (false);

-- =========================================
-- WALLETS
-- =========================================
CREATE TABLE public.wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  locked_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  non_withdrawable NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_deposited NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_withdrawn NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_earned NUMERIC(14,2) NOT NULL DEFAULT 0,
  referral_earned NUMERIC(14,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own wallet" ON public.wallets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- =========================================
-- PLANS
-- =========================================
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  daily_roi_pct NUMERIC(6,3) NOT NULL,
  duration_days INT NOT NULL,
  min_amount NUMERIC(14,2) NOT NULL,
  max_amount NUMERIC(14,2) NOT NULL,
  return_principal BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.plans TO authenticated;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read active plans" ON public.plans FOR SELECT USING (true);
CREATE POLICY "admins manage plans" ON public.plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================
-- INVESTMENTS
-- =========================================
CREATE TABLE public.investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  plan_name TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  daily_roi_pct NUMERIC(6,3) NOT NULL,
  duration_days INT NOT NULL,
  return_principal BOOLEAN NOT NULL,
  days_paid INT NOT NULL DEFAULT 0,
  total_earned NUMERIC(14,2) NOT NULL DEFAULT 0,
  status public.investment_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  last_payout_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.investments TO authenticated;
GRANT ALL ON public.investments TO service_role;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own investments" ON public.investments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- =========================================
-- TRANSACTIONS
-- =========================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.tx_type NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  status public.tx_status NOT NULL DEFAULT 'completed',
  reference TEXT,
  description TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own tx" ON public.transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX ON public.transactions(user_id, created_at DESC);

-- =========================================
-- DEPOSITS
-- =========================================
CREATE TABLE public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  method public.deposit_method NOT NULL,
  status public.tx_status NOT NULL DEFAULT 'pending',
  paystack_ref TEXT,
  proof_note TEXT,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
GRANT SELECT ON public.deposits TO authenticated;
GRANT ALL ON public.deposits TO service_role;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own deposits" ON public.deposits FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- =========================================
-- WITHDRAWALS
-- =========================================
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  fee NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(14,2) NOT NULL,
  bank_name TEXT NOT NULL,
  bank_account_no TEXT NOT NULL,
  bank_account_name TEXT NOT NULL,
  status public.tx_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
GRANT SELECT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own withdrawals" ON public.withdrawals FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- =========================================
-- REFERRALS (chain of L1/L2/L3)
-- =========================================
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(referrer_id, referred_id)
);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own referrals" ON public.referrals FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- =========================================
-- REFERRAL EARNINGS
-- =========================================
CREATE TABLE public.referral_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level SMALLINT NOT NULL,
  source_type public.referral_source NOT NULL,
  source_amount NUMERIC(14,2) NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_earnings TO authenticated;
GRANT ALL ON public.referral_earnings TO service_role;
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own ref earnings" ON public.referral_earnings FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- =========================================
-- DAILY CHECKINS
-- =========================================
CREATE TABLE public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  amount NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, checkin_date)
);
GRANT SELECT ON public.daily_checkins TO authenticated;
GRANT ALL ON public.daily_checkins TO service_role;
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own checkins" ON public.daily_checkins FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- =========================================
-- Helper: generate referral code
-- =========================================
CREATE OR REPLACE FUNCTION public.gen_ref_code() RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE
  code TEXT;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text || clock_timestamp()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = code);
  END LOOP;
  RETURN code;
END $$;

-- =========================================
-- Signup handler
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_referrer_code TEXT;
  v_referrer_id UUID;
  v_l2 UUID;
  v_l3 UUID;
  v_settings public.settings%ROWTYPE;
  v_first_user BOOLEAN;
  v_new_code TEXT;
BEGIN
  SELECT * INTO v_settings FROM public.settings WHERE id = 1;
  v_new_code := public.gen_ref_code();
  v_referrer_code := NULLIF(NEW.raw_user_meta_data->>'referral_code','');

  IF v_referrer_code IS NOT NULL THEN
    SELECT id INTO v_referrer_id FROM public.profiles WHERE referral_code = upper(v_referrer_code);
  END IF;

  INSERT INTO public.profiles (id, full_name, email, referral_code, referred_by)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    v_new_code,
    v_referrer_id
  );

  INSERT INTO public.wallets (user_id) VALUES (NEW.id);

  -- Welcome bonus
  IF v_settings.welcome_bonus_amount > 0 THEN
    UPDATE public.wallets
      SET balance = balance + v_settings.welcome_bonus_amount,
          non_withdrawable = non_withdrawable + CASE WHEN v_settings.welcome_bonus_withdrawable THEN 0 ELSE v_settings.welcome_bonus_amount END,
          updated_at = now()
      WHERE user_id = NEW.id;
    INSERT INTO public.transactions (user_id, type, amount, description)
      VALUES (NEW.id, 'welcome_bonus', v_settings.welcome_bonus_amount, 'Welcome bonus');
  END IF;

  -- Referral chain
  IF v_referrer_id IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, level) VALUES (v_referrer_id, NEW.id, 1);
    SELECT referred_by INTO v_l2 FROM public.profiles WHERE id = v_referrer_id;
    IF v_l2 IS NOT NULL THEN
      INSERT INTO public.referrals (referrer_id, referred_id, level) VALUES (v_l2, NEW.id, 2);
      SELECT referred_by INTO v_l3 FROM public.profiles WHERE id = v_l2;
      IF v_l3 IS NOT NULL THEN
        INSERT INTO public.referrals (referrer_id, referred_id, level) VALUES (v_l3, NEW.id, 3);
      END IF;
    END IF;
  END IF;

  -- First user becomes admin
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO v_first_user;
  IF v_first_user THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- Updated_at trigger for settings
-- =========================================
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER settings_touch BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
