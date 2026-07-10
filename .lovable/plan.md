## 1. Uniform site name (admin-controlled, default "PrimeYield")

- Add a public server function `getPublicSiteName()` that reads `settings.site_name` (fallback `"PrimeYield"`) using the server publishable client. Safe for SSR and public routes.
- Cache it in the root loader (`src/routes/__root.tsx`) via TanStack Query key `["site-name"]` so every route has it available synchronously.
- Update `BrandMark` to read the cached site name (with `"PrimeYield"` fallback) instead of the hard-coded `"HORIZON"` prop default, so header/logo everywhere matches.
- Update page `head()` titles that currently say "PrimeYield" hard-coded (auth page, dashboard, etc.) to still say a sensible title, but for the wordmark/logo everywhere it comes from settings.
- Confirm the settings admin page already lets admin edit `site_name` (it does).

Result: change site name once in Admin → Settings, every page's logo/wordmark updates.

## 2. Validate referral code on registration

- Add a public server function `validateReferralCode(code)` that returns `{ valid: boolean }` by checking `profiles.referral_code`.
- In `src/routes/auth.tsx` signup submit: if a referral code is entered, call the validator first. If invalid, show toast "Invalid referral code" and abort — do not call `supabase.auth.signUp`.
- Empty/blank code stays optional (allowed).

## 3. Admin list + promote testing1@gmail.com

Current admins: `gbdbbd50@gmail.com` (Gbdbbd).

Add `testing1@gmail.com` (user id `2749a184-dbef-4126-8498-ca4a3974195c`) as admin via a data insert into `public.user_roles`.

Optional small UX: the existing Admin → Users page already lists users; no changes needed there unless you also want a dedicated "Admins" section — say the word and I'll add it.

---

### Technical notes

- New files: `src/lib/site.functions.ts` (public `getPublicSiteName`, `validateReferralCode`).
- Edits: `src/components/BrandMark.tsx`, `src/routes/__root.tsx` (prefetch site name), `src/routes/auth.tsx` (referral validation).
- Data change: insert `('admin')` row in `user_roles` for `testing1@gmail.com`.
- No schema migration required.
