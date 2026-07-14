
-- =========================================================
-- SETTINGS: master switch for tasks
-- =========================================================
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS tasks_enabled BOOLEAN NOT NULL DEFAULT false;

-- =========================================================
-- TASKS
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.task_type AS ENUM ('refer_users','deposit_amount','invest_plan','manual_claim');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.user_task_status AS ENUM ('available','pending','completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  task_type public.task_type NOT NULL,
  target_value NUMERIC NOT NULL DEFAULT 0,
  target_plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  reward NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tasks TO authenticated, anon;
GRANT ALL ON public.tasks TO service_role;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tasks readable by anyone" ON public.tasks;
CREATE POLICY "Tasks readable by anyone" ON public.tasks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage tasks" ON public.tasks;
CREATE POLICY "Admins manage tasks" ON public.tasks FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_tasks_updated ON public.tasks;
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- USER_TASKS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.user_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  status public.user_task_status NOT NULL DEFAULT 'pending',
  claim_note TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_id)
);

GRANT SELECT, INSERT, UPDATE ON public.user_tasks TO authenticated;
GRANT ALL ON public.user_tasks TO service_role;

ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own tasks" ON public.user_tasks;
CREATE POLICY "Users read own tasks" ON public.user_tasks FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users insert own tasks" ON public.user_tasks;
CREATE POLICY "Users insert own tasks" ON public.user_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage user_tasks" ON public.user_tasks;
CREATE POLICY "Admins manage user_tasks" ON public.user_tasks FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_user_tasks_updated ON public.user_tasks;
CREATE TRIGGER trg_user_tasks_updated BEFORE UPDATE ON public.user_tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- PAGE CONTENT (text + color overrides, per page)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.page_content (
  page_key TEXT PRIMARY KEY,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  colors JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.page_content TO authenticated, anon;
GRANT ALL ON public.page_content TO service_role;

ALTER TABLE public.page_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Page content readable" ON public.page_content;
CREATE POLICY "Page content readable" ON public.page_content FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage page content" ON public.page_content;
CREATE POLICY "Admins manage page content" ON public.page_content FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_page_content_updated ON public.page_content;
CREATE TRIGGER trg_page_content_updated BEFORE UPDATE ON public.page_content
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
