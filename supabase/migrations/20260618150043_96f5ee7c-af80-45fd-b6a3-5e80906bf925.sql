
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS dashboard_popup_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dashboard_popup_title TEXT NOT NULL DEFAULT 'Welcome',
  ADD COLUMN IF NOT EXISTS dashboard_popup_message TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dashboard_popup_buttons JSONB NOT NULL DEFAULT '[]'::jsonb;
