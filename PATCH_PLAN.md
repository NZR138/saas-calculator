# PATCH PLAN (Safe, Minimal, Reversible)

Date: 2026-03-03  
Constraints honored: minimal reversible patches, no refactor, no dependency upgrades, no auth/UI flow changes.

---

## Patch 1 — Durable Stripe Webhook Idempotency (event-level)

### Why
Current webhook logic does not persist/check Stripe `event.id`, so retries can re-run side effects under failure windows.

### Where
- [app/api/stripe/webhook/route.ts](app/api/stripe/webhook/route.ts)
- [supabase/stripe_webhook_events.sql](supabase/stripe_webhook_events.sql)

### Minimal diff outline
1. Create `stripe_webhook_events` table for durable event claims (unique `event_id`).
2. In webhook handler, claim event with insert + duplicate short-circuit (HTTP 200 `{ duplicate: true }`).
3. Update claim status to `processed` only after successful processing, else `failed` with short error text.
4. Keep existing status-based `.eq("status", "awaiting_payment")` guard to prevent duplicate paid transition.

### Reversal
- Remove idempotency check block and restore current event flow.

### Test steps
1. In Stripe Dashboard, open an existing `checkout.session.completed` event.
2. Click **Resend** 3–5 times (no new payment needed).
3. Verify first process marks paid/email at most once; subsequent deliveries return 200 duplicate/no-op.
4. Verify `stripe_webhook_events` has exactly one row for the event_id with `status='processed'`.

---

## Patch 2 — Exactly-Once Admin Email Guard

### Why
Webhook path can send admin email more than once (notably when DB update errors but fallback email path still triggers send).

### Where
- [app/api/stripe/webhook/route.ts](app/api/stripe/webhook/route.ts)

### Minimal diff outline
1. Add a guard condition before `sendAdminEmail(...)` to ensure email side effect is tied to successful first-time payment transition.
2. Do not send admin email when update failed or when request was already processed.
3. Keep logging for failed DB update path, but avoid side effects there.

### Reversal
- Revert guard condition to current behavior.

### Test steps
1. Simulate duplicate webhook deliveries.
2. Confirm exactly one admin email per paid request.
3. Simulate DB failure path and confirm no email send happens in failure branch.

---

## Patch 3 — Ownership Constraint for `requestId` Updates in Checkout Route

### Why
`POST /api/stripe/checkout-session` updates by `requestId` without explicit ownership restriction in query filters while using service role.

### Where
- [app/api/stripe/checkout-session/route.ts](app/api/stripe/checkout-session/route.ts)

### Minimal diff outline
1. For authenticated users: include ownership filter in update query (`.eq("user_id", authenticatedUser.id)`).
2. For guests: require matching `guest_email` when updating an existing draft/request.
3. If ownership/email check fails, return 404/403 style response without revealing whether ID exists.

### Reversal
- Remove ownership/email query predicates and return to ID-only update.

### Test steps
1. User A creates draft; User B attempts update with User A `requestId` and fails.
2. Guest A request cannot be updated by Guest B email.
3. Legit owner/guest can still update and checkout normally.

---

## Patch 4 — Canonical Domain Normalization

### Why
Current redirects enforce `www`, while metadata/sitemap/robots defaults use non-www, creating mixed canonical signals.

### Where
- [next.config.ts](next.config.ts)
- [app/layout.tsx](app/layout.tsx)
- [app/sitemap.ts](app/sitemap.ts)
- [app/robots.ts](app/robots.ts)
- [app/lib/stripeServer.ts](app/lib/stripeServer.ts)

### Minimal diff outline
1. Define single canonical policy (recommended: `https://www.ukprofit.co.uk` to match redirect behavior).
2. Align fallback URLs and sitemap/robots output to same host.
3. Keep existing redirect behavior unchanged.

### Reversal
- Restore previous non-www fallback constants.

### Test steps
1. Hit both `ukprofit.co.uk` and `www.ukprofit.co.uk` and confirm single redirect target.
2. Verify page canonical tags, `robots.txt`, and `sitemap.xml` all use same host.
3. Verify Stripe success/cancel redirects do not bounce through extra host redirects.

---

## Patch 5 — Rate Limit Resilience (Optional hardening)

### Why
Current in-memory limiter is per-instance and resets on cold starts; it is not globally consistent.

### Where
- [app/lib/rateLimit.ts](app/lib/rateLimit.ts)
- [app/api/stripe/checkout-session/route.ts](app/api/stripe/checkout-session/route.ts)
- [app/api/stripe/written-request-status/route.ts](app/api/stripe/written-request-status/route.ts)

### Minimal diff outline
1. Keep current API unchanged.
2. Add support for pluggable backing store with current memory store as default.
3. Log throttling events with coarse metadata (no sensitive payloads).

### Reversal
- Remove adapter and restore direct in-memory path only.

### Test steps
1. Burst test endpoint > threshold and verify 429 + Retry-After.
2. Ensure normal traffic under threshold works.
3. Validate behavior across at least two deploy instances (if available).

---

# Smoke-Test Checklist (post-patch, must pass)

## A) Checkout + Payment flow
1. Open calculator and go to written breakdown flow.
2. Submit valid questions + email, start checkout.
3. Complete payment in Stripe test mode.
4. Verify `written_requests.status` becomes `paid` and `paid=true`.
5. Verify user sees paid status via `/api/stripe/written-request-status`.

## B) Webhook safety
1. Replay same Stripe webhook event from Dashboard **Resend** 3–5 times.
2. Confirm no duplicate DB side-effects.
3. Confirm no duplicate admin emails.
4. Confirm one `stripe_webhook_events` row per `event_id`.

## C) Access control
1. Create draft as User A.
2. Attempt update/checkout with User B using User A `requestId`.
3. Confirm access denied/no cross-user mutation.

## D) Domain consistency
1. Request both `ukprofit.co.uk` and `www.ukprofit.co.uk`.
2. Confirm canonical/OG URLs, sitemap and robots host are identical.
3. Confirm Stripe success/cancel URLs point to canonical host.

## E) Regression checks
1. `npm run lint`
2. `npm run typecheck`
3. `npm run build`
4. Manual sanity: signup/login, calculator modes, checkout entry, legal pages.

---

## Rollback Strategy

Each patch above is isolated by file and reversible via single commit revert.  
Recommended rollout: one patch per commit + smoke-test after each merge.
