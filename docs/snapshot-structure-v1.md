# Snapshot Structure v1 (Freeze Baseline)

Date: 2026-02-25  
Scope: documentation-only baseline before V2 architecture

## 1) Snapshot table fields (`public.snapshots`)

Primary source: `SUPABASE_SETUP.sql`, `supabase/snapshots.sql`

- `id` (uuid, PK)
- `user_id` (uuid, FK -> `auth.users.id`)
- `revenue` (numeric)
- `total_costs` (numeric)
- `vat` (numeric)
- `net_profit` (numeric)
- `margin` (numeric)
- `roas` (numeric)
- `created_at` (timestamptz, default `now()`)

Indexes:
- `idx_snapshots_user_id` on (`user_id`)
- `idx_snapshots_created_at` on (`created_at desc`)

RLS:
- `Snapshots insert own` (insert with `auth.uid() = user_id`)
- `Snapshots select own` (select with `auth.uid() = user_id`)

## 2) Expected input fields (calculator runtime)

From `app/hooks/useCalculator.ts`:
- `productPrice`
- `unitsSold`
- `productCost`
- `shippingCost`
- `paymentProcessingPercent`
- `adSpend`
- `vatIncluded`

## 3) Expected result fields (calculator runtime)

Computed in `app/hooks/useCalculator.ts` and exposed to UI:
- `revenue`
- `totalCosts`
- `vatAmount`
- `profit`
- `margin`
- `roas`

## 4) Snapshot write mapping

From `app/components/ResultsSection.tsx` (`handleSaveSnapshot`):

- `revenue` <- `safeRevenue`
- `total_costs` <- `safeTotalCosts`
- `vat` <- `safeVatAmount`
- `net_profit` <- `safeProfit`
- `margin` <- `safeMargin`
- `roas` <- `safeRoas`

Inserted via `supabase.from("snapshots").insert([payload])`.

## 5) Dashboard field mapping (current v1 page)

From `app/dashboard/page.tsx`:

Displayed columns map as:
- Date <- `created_at`
- Product Cost <- `product_cost`
- Shipping <- `shipping_cost`
- Payment <- `payment_processing_percent`
- Revenue <- `revenue`
- Profit <- `net_profit`
- Margin <- `margin`

Note: dashboard fetch uses `.select("*")` and renders whichever fields exist in row shape.

## 6) Formatting logic references

- Currency: `currencyFormatter` (`Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" })`) in `app/dashboard/page.tsx`
- Date/time: `dateFormatter` (`Intl.DateTimeFormat("en-GB", ...)`) in `app/dashboard/page.tsx`
- Numeric sanitization: `toNumber(value) => Number(value) || 0` in `app/dashboard/page.tsx`
- Percent formatting: `.toFixed(2) + "%"` for payment and margin in `app/dashboard/page.tsx`
