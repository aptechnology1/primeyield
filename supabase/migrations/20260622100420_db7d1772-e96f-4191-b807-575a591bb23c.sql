
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS min_deposit NUMERIC NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS deposit_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS withdrawal_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS investment_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_message TEXT NOT NULL DEFAULT 'We are performing scheduled maintenance. Please check back soon.';
