# PRODUCTION SNAPSHOT v1.1

- Date: 2026-02-25
- Deployment URL: https://ukprofit.co.uk
- Snapshot tag: v1.1-stable-html-email
- Commit SHA: b0cbc30d811fd0879df5aa3b57d724fd8939dbce

## Stable Features (Verified)

- Stripe payment flow works end-to-end.
- Stripe webhook returns 200 after successful signature verification.
- Supabase updates are applied correctly in paid flow.
- Admin email is sent via Resend with HTML template.
- Numeric values in email are formatted to 2 decimals.
- Sender/recipient are env-driven (`RESEND_FROM_EMAIL`, `ADMIN_EMAIL`).
- Build and typecheck pass.

## Required Environment Variables

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `ADMIN_EMAIL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Confirmed Working Flow

User -> Stripe Checkout -> Stripe Webhook -> Supabase update -> Admin email via Resend

## Rollback

```bash
git checkout v1.1-stable-html-email
```

## Notes

- Snapshot is created as a restore point of a production-stable state.
- No runtime/business-logic refactor included in this snapshot operation.
