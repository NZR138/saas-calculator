# SECURITY AUDIT (Read-Only)

Date: 2026-03-03  
Scope: Repository inspection only (no code/runtime/dashboard/database changes)

---

## Executive Summary

Overall security posture is reasonable for a small Stripe + Supabase app, with strong baseline controls already present:
- Stripe webhook signature verification exists.
- Raw webhook body is used for signature verification.
- Service-role usage is server-side only.
- Rate limiting exists on abuse-prone public endpoints.
- SQL files define RLS for user tables.

Highest-priority risks found:
1. **No durable webhook event idempotency store** (duplicate processing risk under retries/failures).
2. **Exactly-once admin email delivery guard is missing** (duplicate admin emails possible).
3. **Public draft/update path can update by request ID without ownership check** (IDOR-style risk if UUID leaks).
4. **Canonical domain usage is inconsistent (www vs non-www)**, including sitemap/robots/metadata values.

---

## CHECK 1 — Data Isolation (Supabase/RLS assumptions)

### 1.1 Tables used by app (code + SQL inventory)

**Runtime-used table(s):**
- `public.written_requests`
  - Evidence: [app/api/stripe/checkout-session/route.ts](app/api/stripe/checkout-session/route.ts) uses `.from("written_requests")` for insert/update.
  - Evidence: [app/api/stripe/webhook/route.ts](app/api/stripe/webhook/route.ts) updates/selects `written_requests` on webhook.
  - Evidence: [app/api/stripe/written-request-status/route.ts](app/api/stripe/written-request-status/route.ts) reads `written_requests` by `id + stripe_session_id`.

**Schema-defined tables (present in SQL files):**
- `public.snapshots`
  - Evidence: [supabase/snapshots.sql](supabase/snapshots.sql), [SUPABASE_SETUP.sql](SUPABASE_SETUP.sql), [docs/db-schema-v1.sql](docs/db-schema-v1.sql)
- `public.written_requests`
  - Evidence: [supabase/written_requests.sql](supabase/written_requests.sql), [supabase/written_requests_payment_snapshot_migration.sql](supabase/written_requests_payment_snapshot_migration.sql), [docs/db-schema-v1.sql](docs/db-schema-v1.sql)
- `public.payments`
  - Evidence: [supabase/written_requests.sql](supabase/written_requests.sql), [docs/db-schema-v1.sql](docs/db-schema-v1.sql)

### 1.2 User-related data fields observed

- `written_requests`: `user_id`, `guest_email`, `question_1/2/3`, `stripe_session_id`, `payment_intent_id`, `paid`, `status`, `calculator_snapshot`, `calculator_results`.
- `payments`: `user_id`, `written_request_id`, `stripe_payment_intent_id`, `amount`, `currency`.
- `snapshots`: `user_id`, revenue/cost/profit metrics.

### 1.3 RLS assumptions (repo-only evidence)

RLS is explicitly enabled in SQL files for:
- `snapshots` — select/insert own
- `written_requests` — select/insert own
- `payments` — select/insert own

Evidence:
- [supabase/snapshots.sql](supabase/snapshots.sql)
- [supabase/written_requests.sql](supabase/written_requests.sql)

### 1.4 Expected RLS policy matrix (documented expectation)

| Table | Data sensitivity | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|---|
| snapshots | user financial estimates | own rows only | own rows only | own rows only (if needed) | own rows only (if needed) |
| written_requests | PII + payment workflow state | own rows only (except service webhook ops) | own rows only | service-only for paid/status transitions; user update limited to own drafts | service-only or owner-only if user delete exists |
| payments | payment records | own rows only | service-only preferred | service-only | service-only |

### 1.5 Findings

- **LOW**: SQL policies are present and explicit in repo.
- **MEDIUM (clarity gap)**: Runtime uses service-role clients for API routes, so DB-level RLS is bypassed by server code paths; access control depends on application logic in handlers.

---

## CHECK 2 — Stripe Webhook Integrity

Webhook route: [app/api/stripe/webhook/route.ts](app/api/stripe/webhook/route.ts)

### 2.a Signature verification with `STRIPE_WEBHOOK_SECRET`
- **PASS**
- Evidence snippet: `stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET as string)`.

### 2.b Raw body usage
- **PASS**
- Evidence snippet: `const body = await req.text();` before verification.

### 2.c Method restriction (POST-only)
- **PASS (framework behavior)**
- Only `export async function POST(...)` is defined; no `GET` handler exists.

### 2.d Idempotency via durable event tracking (`event.id`)
- **PARTIAL / FAIL for durable idempotency**
- No persistence/check of Stripe `event.id` found.
- Current mitigation: conditional DB transition `.eq("status", "awaiting_payment")` on `written_requests` reduces duplicate state flips.
- Residual risk: duplicate side-effects still possible in error branches.

**Risk: HIGH (operational integrity)**

---

## CHECK 3 — Auth Gate on API Routes

### 3.1 API route inventory

- `POST /api/stripe/checkout-session` — [app/api/stripe/checkout-session/route.ts](app/api/stripe/checkout-session/route.ts)
- `POST /api/stripe/webhook` — [app/api/stripe/webhook/route.ts](app/api/stripe/webhook/route.ts)
- `GET /api/stripe/written-request-status` — [app/api/stripe/written-request-status/route.ts](app/api/stripe/written-request-status/route.ts)

### 3.2 Route categorization and findings

| Endpoint | Category | Writes data | Auth model | Finding |
|---|---|---:|---|---|
| POST /api/stripe/checkout-session | Public + optional auth | Yes (`written_requests`) | Uses bearer token when present via `getUserFromAccessToken`; guest allowed | **MEDIUM**: request updates by `requestId` are not ownership-checked in handler when service role is used |
| POST /api/stripe/webhook | Webhook | Yes (`written_requests` status/intent) + email send | Stripe signature only | **MEDIUM**: no durable event-id idempotency |
| GET /api/stripe/written-request-status | Public status probe | No write | Requires `request_id + session_id` pair | **LOW**: no auth required by design; exposure limited by requiring matching pair |

### 3.3 Cross-user protections (write paths)

- Server does not trust client-submitted `user_id` directly; user identity is read from bearer token (`getUserFromAccessToken`) where used.
- However, update-by-ID flows on `written_requests` in checkout route are not always constrained by current user in SQL filters.

**Risk: MEDIUM (IDOR-style if UUID leaks/gets shared)**

---

## CHECK 4 — Email Sending & Abuse Controls

### 4.1 Email sender path

- Resend is used in webhook route only:
  - Evidence: [app/api/stripe/webhook/route.ts](app/api/stripe/webhook/route.ts) `new Resend(process.env.RESEND_API_KEY)` and `resend.emails.send(...)`.

### 4.2 Paid source of truth

- Email send logic is triggered from webhook `checkout.session.completed`, not from redirect result.
- Frontend “paid” display is derived from API status endpoint (`/api/stripe/written-request-status`) reading DB `paid` + `status`.

**Result: PASS for “not trusting redirect alone.”**

### 4.3 Exactly-once email guard

- No `email_sent_at` guard in active runtime path.
- Repo contains migration adding `admin_email_sent_at` and another migration dropping it:
  - [supabase/written_requests_admin_email_sent_at_migration.sql](supabase/written_requests_admin_email_sent_at_migration.sql)
  - [supabase/written_requests_drop_admin_email_sent_at.sql](supabase/written_requests_drop_admin_email_sent_at.sql)
- In webhook route, email can still be sent when DB update errors (`shouldSendEmail = true` on error path).

**Risk: HIGH (duplicate admin emails possible).**

### 4.4 Abuse controls

- In-memory IP rate limiting exists:
  - `checkout-session`: 20/min
  - `written-request-status`: 60/min
  - Evidence: [app/lib/rateLimit.ts](app/lib/rateLimit.ts), route usage in checkout/status handlers.

**Risk: MEDIUM-LOW** (effective baseline, but not distributed/shared across server instances).

---

## CHECK 5 — Secrets & Environment Safety

### 5.1 Env keys referenced in code

Observed keys:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_APP_URL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `ADMIN_EMAIL`

Evidence: [app/lib/serverSupabase.ts](app/lib/serverSupabase.ts), [app/api/stripe/webhook/route.ts](app/api/stripe/webhook/route.ts), [app/api/stripe/checkout-session/route.ts](app/api/stripe/checkout-session/route.ts), [app/lib/stripeServer.ts](app/lib/stripeServer.ts), [app/lib/supabaseClient.ts](app/lib/supabaseClient.ts), [app/layout.tsx](app/layout.tsx), [app/sitemap.ts](app/sitemap.ts).

### 5.2 Secret exposure scan

- No hardcoded Stripe/Supabase secret literals in app code found.
- Service role key usage appears in server files/route handlers only.
- Client-side Supabase usage correctly uses anon/public key.

### 5.3 Red flags

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is not referenced (not necessarily a bug if Stripe.js client key is intentionally unused).
- Some docs include placeholder key formats, which is expected and not an exposure.

**Risk: LOW**

---

## CHECK 6 — Domain / Redirect / Webhook URL Consistency

### 6.1 Current behavior (repo evidence)

- Redirect policy forces `ukprofit.co.uk` and `*.vercel.app` to `https://www.ukprofit.co.uk`:
  - [next.config.ts](next.config.ts)
- Metadata/site URL fallback defaults to non-www in multiple places:
  - [app/layout.tsx](app/layout.tsx) fallback `https://ukprofit.co.uk`
  - [app/sitemap.ts](app/sitemap.ts) fallback `https://ukprofit.co.uk`
  - [app/robots.ts](app/robots.ts) sitemap URL `https://ukprofit.co.uk/sitemap.xml`

### 6.2 Absolute URL dependencies

- Stripe success/cancel URLs are built from `getAppBaseUrl(...)` using:
  - `NEXT_PUBLIC_SITE_URL` or `NEXT_PUBLIC_APP_URL` or request origin.
  - Evidence: [app/lib/stripeServer.ts](app/lib/stripeServer.ts), [app/api/stripe/checkout-session/route.ts](app/api/stripe/checkout-session/route.ts)

### 6.3 Finding

- **MEDIUM**: Mixed canonical assumptions (www forced by redirect vs non-www defaults in metadata/sitemap/robots) can create duplicate indexing signals and unnecessary redirects in payment return URLs.

---

## Risk Register

| ID | Finding | Risk | Affected surface |
|---|---|---|---|
| R1 | No durable webhook `event.id` idempotency ledger | HIGH | Stripe webhook processing |
| R2 | No exactly-once admin email guard | HIGH | Webhook email notifications |
| R3 | Checkout update path accepts `requestId` without explicit ownership constraint | MEDIUM | `written_requests` write integrity |
| R4 | Canonical/domain inconsistency (`www` vs non-www defaults) | MEDIUM | SEO, callback URL consistency |
| R5 | In-memory rate limiting only (non-distributed) | MEDIUM-LOW | Abuse resilience under scale |

---

## Endpoints & Tables Affected (Quick Index)

### Endpoints
- `POST /api/stripe/checkout-session` — writes `written_requests`, creates Stripe session.
- `POST /api/stripe/webhook` — verifies Stripe signature, updates `written_requests`, sends admin email.
- `GET /api/stripe/written-request-status` — reads payment status by `request_id + session_id`.

### Tables
- `public.written_requests` (active runtime table)
- `public.payments` (schema-defined, no runtime writes found in current code)
- `public.snapshots` (schema-defined legacy calculator snapshot table)

---

## Notes

This audit is repository-only and intentionally excludes runtime dashboard checks (Stripe, Supabase, Vercel), network traffic traces, and database state inspection in production.
