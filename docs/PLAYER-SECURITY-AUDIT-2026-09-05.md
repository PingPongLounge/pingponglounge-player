# PLAYER Security & Production Readiness Audit — 05.09.2026

Scope: `PingPongLounge/pingponglounge-player`, branch `player-system-check-build`.

This is a static code/repository audit. It does **not** claim that production Supabase RLS, Vercel environment variables, Stripe dashboard/webhooks, Google OAuth, real email delivery or physical access systems were externally verified.

## Executive status

### P0 — before production rollout

1. **Versioned database schema + RLS missing from PLAYER repo — OPEN**
   - No `supabase/migrations/` or equivalent reproducible DB/RLS source is present in this repo.
   - The app depends on tables including `profiles`, `public_profiles`, `league_seasons`, `league_registrations`, `league_matches`, `league_messages`, `elo_history`, notifications, tournament and booking tables.
   - Production policies therefore cannot be reconstructed or independently reviewed from Git.
   - Action: export canonical schema, constraints, functions and RLS into migrations; review least privilege; test anon/authenticated/service-role paths.

2. **PLAYER repository is public — OPEN / OWNER ACTION**
   - Repository metadata currently reports `visibility: public`.
   - Source visibility is not itself a vulnerability, but it increases the consequence of historic secret/config mistakes and exposes internal application architecture unnecessarily.
   - Action: decide explicitly whether PLAYER should be private. If private is intended, change repository visibility and then rotate any secrets/codes that may ever have been committed.

3. **Historic secret / physical access-code exposure — NOT VERIFIED**
   - Current static review is not proof that Git history never contained secrets.
   - Agency specifically flagged access codes in history.
   - Action: rotate physical door/access codes, webhook secrets and any credentials ever committed; scan full Git history with a secret scanner.

4. **Staging + Stripe test environment — OPEN / NOT VERIFIED**
   - No evidence in repo proves an isolated staging stack with safe test payments and test DB.
   - Action: staging Vercel project/environment, test Supabase or safely isolated schema, Stripe test mode, webhook endpoint verification.

## P1 — important hardening

### Authentication

**DONE on this branch**
- Dangerous `/api/reset-exchange` endpoint removed. It returned access + refresh tokens in a JSON response after accepting PKCE material and should not exist.
- Authenticated API routes generally receive 401 from middleware rather than HTML redirects.
- Session-cookie refresh handling in middleware preserves refreshed cookies.
- Canonical password reset flow exists under `/auth/reset-password`.

**NOT VERIFIED externally**
- Real Supabase reset/confirmation email templates.
- Google OAuth end-to-end.
- Supabase auth rate limits / abuse controls.
- Real Safari/iOS cookie behavior.

### League / rating integrity

**DONE / strong controls present**
- Global league membership is server-side and the global registration endpoint ignores arbitrary supplied season IDs.
- Challenge/direct-match APIs verify authenticated participants and same-season membership.
- A player cannot confirm their own submitted league result.
- `winner_id` and sets are validated server-side.
- ELO confirmation uses a server/admin path and an atomic status transition to avoid double scoring.
- Ranked farming is limited to max 5 rated matches against the same opponent in a rolling 12-month window.
- Monthly activity penalty is applied only to the global league, preventing double penalties when optional seasons exist.
- Season generation is prohibited for the global league and refuses to overwrite a season that already contains matches.

**OPEN**
- DB constraints/RLS must independently enforce the assumptions above where appropriate.
- Add dedicated automated tests for voluntary Season join/leave, generated assignments, global-ELO impact and permission abuse.

### Admin authorization

**PARTIAL / RISK**
- Several server routes check staff identity server-side.
- `app/admin/liga/page.tsx` also performs direct client-side Supabase writes (for example season status changes). A client-side `STAFF_EMAILS` check is UX only, not a security boundary.
- Safety of these writes currently depends on production RLS, which is not versioned here.

**Action**
- Move privileged mutations behind server-side admin APIs using one canonical role check.
- RLS must deny equivalent direct client mutations to non-admin users.

### HTTP/browser hardening

**DONE on this branch**
- Added baseline response headers globally:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - restrictive camera/microphone/geolocation `Permissions-Policy`
  - HSTS

**OPEN**
- CSP intentionally not added blindly because the app uses Supabase, Stripe/external services and inline style-heavy React. Build a tested CSP from actual required origins rather than breaking production.

### Rate limiting

**PARTIAL**
- `lib/ratelimit.ts` exists.
- It is process-local/in-memory only, so on serverless it is best-effort, not a global guarantee.

**Action**
- Identify abuse-sensitive endpoints (login adjuncts, guest registration, invite, result/challenge spam, checkout creation, contact-like endpoints).
- Use a shared store (Redis/Upstash or equivalent) where hard guarantees are needed.

## CI / release engineering

**PARTIAL**
- Tests exist: Vitest and Playwright files are in repo.
- A complete GitHub Actions workflow template exists as `ci/test.yml.txt`.
- It is **not active CI** because there is no `.github/workflows/*.yml` workflow on the branch.
- Branch metadata currently shows no required status checks/protection.

**Action**
1. Configure required GitHub secrets for CI.
2. Promote reviewed `ci/test.yml.txt` to `.github/workflows/test.yml`.
3. Require build/type/test checks before merge to main.
4. Protect main / require PR review as appropriate.

## Database / app contract

**OPEN — matches agency finding**
- PLAYER has no versioned DB contract in migrations.
- PPL website and PLAYER integration must document which app owns writes to shared entities (profiles, events/tournaments, bookings/payments, rankings, etc.).
- Do not solve this with duplicated business logic.

Recommended ownership principle:
- PPL website: product/event sale, official event creation, booking/payment.
- PLAYER: player identity, matchmaking, challenges, results, global rating/community.
- Shared data: one documented schema and explicit server/API contracts.

## Payment / webhook test scope still required

For every payment-capable flow test:
- server derives or validates authoritative amount/product/event;
- Stripe session ownership and metadata cannot be changed to credit another user/order;
- webhook signature verification;
- webhook idempotency / duplicate delivery;
- delayed/out-of-order webhook;
- failed/expired checkout;
- double click / repeated checkout creation;
- refund/cancellation behavior;
- reservation expiration/release;
- no credit/reward before verified payment;
- test vs live key isolation.

This audit did not execute real Stripe transactions.

## Privacy / data protection still required

OPEN / product-owner decisions:
- account deletion path and dependent records;
- export/access request procedure;
- retention periods for chat/messages, event registrations, access logs and booking/payment metadata;
- minimization of personal data exposed in `public_profiles`;
- audit logging for privileged changes where necessary.

## Agency findings — status mapping

| Agency concern | Status 05.09.2026 |
|---|---|
| Payment/access-control before features | PARTIAL — key code paths improved; full production payment/RLS verification remains |
| DB schema/policies not version controlled | OPEN / CONFIRMED for PLAYER |
| Two apps write differently to shared tables | OPEN — needs explicit app/data contract |
| No staging | NOT VERIFIED / treat as OPEN |
| No CI | PARTIAL — workflow template exists, but no active `.github/workflows` CI |
| Access codes in repo history | NOT VERIFIED — rotate/scan remains required |
| Auth stability | MUCH IMPROVED; real external provider/email tests remain |
| League integrity | MUCH IMPROVED; server checks + atomic confirmation + anti-farming present |

## Release gate

Do not call PLAYER production-ready until all P0 items have owners and the following gate passes:

1. Current branch build/type/tests green.
2. Real auth smoke: register, confirm email, login, reset, logout, Google OAuth if offered.
3. RLS abuse matrix tested with anon, normal user, other user, staff, service role.
4. League abuse tests: forged user IDs, cross-season access, self-confirm, duplicate confirmation, duplicate match, opponent farming.
5. Payment/webhook test matrix in Stripe test mode.
6. Mobile Safari + Chromium smoke.
7. Secrets/history scan and rotation complete.
8. Staging sign-off before production merge/deploy.

## Changes made during this audit

- Removed token-exposing reset exchange route.
- Added baseline security response headers.
- Scoped global monthly activity penalty correctly.
- Protected season generation from destructive overwrite/global misuse.
- Built voluntary 3-month Season flow on top of the one global rating.

Production was not deployed by this audit.
