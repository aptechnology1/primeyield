## Horizon — Investment Platform

Mobile-first investment app in the "Serious financial ledger" direction. Currency ₦ (Nigeria). Default brand name "Horizon", admin-configurable.

### Stack
- TanStack Start + Lovable Cloud (Supabase) for auth, DB, server functions
- Paystack for card/bank deposits (test mode first; user provides keys later)
- shadcn/ui + Tailwind v4 design tokens copied verbatim from chosen prototype (emerald primary `#059669`, near-black ink, JetBrains Mono for figures, Inter for UI)

### Database (migrations)
- `app_role` enum: `admin`, `user` + `user_roles` table + `has_role()` security-definer
- `profiles` — id (FK auth.users), full_name, username, referral_code (unique), referred_by (FK profiles), bank_name, bank_account_no, bank_account_name, created_at
- `wallets` — user_id PK, balance, locked_balance, total_deposited, total_withdrawn, total_earned, referral_earned
- `plans` — id, name, daily_roi_pct, duration_days, min_amount, max_amount, return_principal (bool), is_active, sort_order
- `investments` — id, user_id, plan_id, amount, daily_roi_pct, duration_days, return_principal, days_paid, total_earned, status (active/completed/cancelled), started_at, ends_at, last_payout_at
- `transactions` — id, user_id, type (deposit/withdrawal/investment/roi/referral/welcome_bonus/daily_checkin), amount, status (pending/approved/rejected/completed), reference, meta jsonb, created_at
- `deposits` — id, user_id, amount, method (paystack/manual), status, paystack_ref, proof_url, admin_note, created_at, processed_at
- `withdrawals` — id, user_id, amount, fee, net_amount, bank_snapshot jsonb, status, admin_note, created_at, processed_at
- `referrals` — id, referrer_id, referred_id, level (1|2|3), created_at  (built at signup from `referred_by` chain)
- `referral_earnings` — id, user_id, from_user_id, level, source_type, source_amount, amount, created_at
- `daily_checkins` — id, user_id, date (unique per user/day), amount
- `settings` — singleton row: site_name, welcome_bonus_amount, welcome_bonus_withdrawable, daily_checkin_amount, ref_l1_pct, ref_l2_pct, ref_l3_pct, ref_source (deposit/investment/roi), min_withdrawal, max_withdrawal, withdrawal_fee_pct, paystack_enabled, manual_deposit_enabled, manual_bank_name, manual_bank_account, manual_bank_account_name

RLS: users see only their own rows; admins via `has_role('admin')`. `settings` readable by anon (site_name, public flags only via a view), full row by admin. GRANTs included per public-schema rule.

Triggers:
- on `auth.users` insert → create profile (claim referral code from signup metadata), wallet, build L1/L2/L3 referral rows from chain, credit welcome bonus as transaction
- first user signup → grant `admin` role automatically

### Server functions (createServerFn, auth-protected)
- `getDashboard` — wallet, active investments, today's checkin status, recent tx
- `claimDailyCheckin` — idempotent per UTC date, credits wallet + transaction
- `listPlans` / `purchasePlan(planId, amount)` — debits wallet, creates investment, optional referral commission on investment
- `initPaystackDeposit(amount)` → returns auth URL; `verifyPaystackDeposit(reference)` server-verifies via Paystack secret, credits wallet, fires referral commission if `ref_source=deposit`
- `submitManualDeposit(amount, proofUrl)` — pending
- `requestWithdrawal(amount)` — validates min/max, deducts fee, locks balance, creates pending row
- `updateBankDetails`, `getReferralTree`, `getReferralEarnings`

Admin-only server functions:
- `adminListUsers`, `adminPromote/demote`, `adminUpsertPlan`, `adminTogglePlan`
- `adminListDeposits`, `adminApproveDeposit`, `adminRejectDeposit` (credits wallet + referral commission)
- `adminListWithdrawals`, `adminMarkWithdrawalPaid`, `adminRejectWithdrawal` (refund lock)
- `adminUpdateSettings`

Public server fn: `getPublicSettings` (just site_name + which deposit methods are enabled) for unauth pages.

ROI accrual: handled lazily on each `getDashboard` call — compute days elapsed since `last_payout_at`, cap at `duration_days`, credit wallet + transactions, mark complete and (optionally) return principal. Avoids needing a cron.

### Routes
Public:
- `/` — landing (hero, plans preview, CTA)
- `/auth` — sign-in / sign-up (sign-up accepts `?ref=CODE`)

`_authenticated/`:
- `/dashboard` — balance card, daily check-in CTA, active investments, referral block, recent activity (matches chosen prototype 1:1)
- `/plans` — list + purchase sheet
- `/deposit` — Paystack tab + Manual tab (manual hidden when admin disables it)
- `/withdraw` — bank details + amount form, history
- `/referrals` — link, L1/L2/L3 counts + earnings
- `/profile` — name, bank details, change password, sign out

`_authenticated/admin/`:
- `/admin` — overview (pending counts)
- `/admin/users`, `/admin/plans`, `/admin/deposits`, `/admin/withdrawals`, `/admin/settings`
Gate with `_authenticated/_admin/route.tsx` calling `has_role`.

Bottom nav (Home / Plans / Deposit / Profile) + admin entry surfaced in Profile when role=admin.

### Setup & secrets
1. Enable Lovable Cloud
2. Run migrations
3. Secrets requested after enable: `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY` (when user is ready — Paystack tab shows "Payments not configured" otherwise so user can test everything else first)

### Out of scope (v1)
- Email verification flow customization (Supabase defaults)
- KYC / document upload
- 2FA
- Crypto withdrawals
- Push notifications
- Withdrawal to crypto wallet
- Automated cron (using lazy accrual instead)

### What you'll do post-build
- Sign up first → you become admin automatically
- Go to `/admin/settings` to set bonus, check-in, referral %, min/max withdrawal, manual bank info, site name
- Create plans in `/admin/plans`
- Add Paystack keys when ready to accept card payments
