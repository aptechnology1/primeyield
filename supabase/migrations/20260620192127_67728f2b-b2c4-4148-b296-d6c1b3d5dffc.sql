
-- Add fixed price column to plans (replaces min/max range)
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS price NUMERIC(14,2) NOT NULL DEFAULT 0;
-- Backfill price from min_amount for existing rows
UPDATE public.plans SET price = min_amount WHERE price = 0;
