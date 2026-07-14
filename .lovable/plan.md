
## 1. Delete user (hard delete)

- Add `adminDeleteUser({ userId })` server fn (admin-only). Uses `supabaseAdmin.auth.admin.deleteUser()` — cascades handle `profiles`, `wallets`, `investments`, `deposits`, `withdrawals`, `transactions`, `referrals`, `user_roles` (already `ON DELETE CASCADE` for most; migration adds any missing cascades).
- Add a Delete button on the Admin → Users card with confirm dialog. Refuses to delete self.

## 2. Admin → Investments (purchased plans)

- New route `src/routes/_authenticated/admin/investments.tsx` + tab in admin nav.
- Server fns: `adminListInvestments`, `adminDeleteInvestment`, `adminCompleteInvestment` (sets `status='completed'`, credits any remaining ROI + principal if plan returns it), `adminRestartInvestment` (resets `start_date=now`, `end_date`, `last_payout_at`, `status='active'`, `total_earned=0`).
- Card shows user, plan name, amount, daily ROI, start/end, status, total earned; buttons: Complete, Restart, Delete.

## 3. Task system

### Schema (migration)
- `tasks` table: `id, title, description, task_type` (`refer_users` | `deposit_amount` | `invest_plan` | `manual_claim`), `target_value` (numeric — e.g. count or amount), `target_plan_id` (nullable, for `invest_plan`), `reward` (numeric, wallet-withdrawable), `sort_order` (int, unique-ish), `is_active` (bool).
- `user_tasks` table: `id, user_id, task_id, status` (`locked` | `available` | `pending` | `completed`), `completed_at`, `claim_note` (nullable). Unique(user_id, task_id).
- `settings.tasks_enabled` (bool, default false) — the master switch that hides all task UI when off.
- RLS: users select/insert their own `user_tasks`, read active `tasks`. Admins full access.
- DB function `unlock_next_task(user_id)` and `complete_task(user_id, task_id)` — called from server fns for auto-verified tasks.

### Server functions
- `getTasksFeature()` — returns `{ enabled: bool }` (public/cached).
- `getMyTasks()` — returns tasks in sort order with computed status per user: current unlocked task + locked next + completed.
- `verifyAndClaimTask({ taskId, note? })` — server-side verification per `task_type`:
  - `refer_users`: count from `referrals` where `referrer_id=uid AND level=1` ≥ target.
  - `deposit_amount`: sum of approved deposits ≥ target.
  - `invest_plan`: exists active/completed investment (matching `target_plan_id` if set).
  - `manual_claim`: marks `pending` with note; requires admin approval.
- `adminListTaskClaims()` + `adminApproveTaskClaim({ userTaskId, approve })` — for manual claims.
- Admin CRUD: `adminListTasks`, `adminUpsertTask`, `adminDeleteTask`, `adminReorderTasks`.

### Task completion flow
On successful verification: credit `wallet.balance += reward`, insert `transactions` row `type='task_reward'`, mark `user_tasks.status='completed'`, unlock next `sort_order`.

### UI
- Admin → Tasks page: list/create/edit/delete/reorder tasks, view manual claims queue, toggle master switch.
- Only when `tasks_enabled=true`:
  - Dashboard: "Tasks" card showing current unlocked task + reward + CTA.
  - Profile page: "Tasks" item in menu → `/tasks` page.
  - `BottomNav`: 5th item "Tasks" (icon `ListChecks`) between Deposit and Profile.
- `/tasks` route: list of all tasks with lock/unlock state, "Complete" button on the current one, manual claim submits a note.
- When `tasks_enabled=false`: no nav item, no dashboard card, no profile item, no route link — completely invisible.

## 4. Per-page content + color editor (Full)

### Schema
- `page_content` table: `page_key` (pk text — e.g. `"dashboard"`, `"plans"`, `"auth"`), `content` (jsonb — flat map of `field_key` → `string`), `colors` (jsonb — map of CSS var name → hex/hsl), `updated_at`.
- Seeded per known page with the current default strings.

### Runtime
- `getPageContent(pageKey)` public server fn (cached 60s in Query).
- New hook `usePageContent(pageKey)` returns `t(key, fallback)` + `applyColors()`.
- A `<PageContentBoundary pageKey>` wrapper for each editable route: injects a `<style>` tag scoping CSS vars for that page (`--primary`, `--background`, `--accent`, `--foreground`, `--card`) so admin colors override the theme only within that page.
- Editable text nodes call `t("hero.title", "Grow your portfolio")` — the fallback stays as the source of truth in code and shows if admin hasn't overridden.

### Admin editor
- New route `/admin/content` — list of pages (dashboard, plans, deposit, withdraw, profile, auth, my-plans, referrals, support, index).
- Selecting a page opens a two-column editor:
  - Left: every registered text key with an input showing current override (or placeholder = default).
  - Right: color pickers for the scoped CSS vars.
- Save writes to `page_content`, invalidates the Query key `["page-content", pageKey]`, live preview refresh.

### Scope of "editable"
- Only text nodes wrapped in `t(...)` become editable. First pass: wrap headings, subheadings, primary CTA labels, section labels on the ~10 main routes. Deep-tree edits (every button label everywhere) can be added incrementally — the framework supports it without more migrations.

## 5. Technical notes

- New files:
  - `src/lib/tasks.functions.ts`, `src/lib/content.functions.ts`, `src/lib/investments-admin.functions.ts`
  - `src/routes/_authenticated/admin/investments.tsx`, `.../admin/tasks.tsx`, `.../admin/content.tsx`, `src/routes/_authenticated/tasks.tsx`
  - `src/components/PageContent.tsx` (provider + `t()` hook + color injector), `src/components/TaskCard.tsx`
- Edits:
  - `src/lib/admin.functions.ts` (add `adminDeleteUser`)
  - `src/routes/_authenticated/admin/users.tsx` (Delete button)
  - `src/routes/_authenticated/admin/route.tsx` (new tabs)
  - `src/components/BottomNav.tsx`, `src/routes/_authenticated/dashboard.tsx`, `src/routes/_authenticated/profile.index.tsx` (conditional task UI)
- Migrations: one migration for `tasks`, `user_tasks`, `page_content`, `settings.tasks_enabled`, DB helpers, RLS + GRANTs, plus any missing `ON DELETE CASCADE` for user deletion.

Ready to build all of the above in one pass — say the word.
