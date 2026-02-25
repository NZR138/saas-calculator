# Dashboard v1 Structure (Freeze Baseline)

Date: 2026-02-25  
Source file: `app/dashboard/page.tsx`

## 1) Rendering location

- Component: `DashboardPage`
- File: `app/dashboard/page.tsx`
- Table block: around lines 120-160

## 2) Wrapper / layout classes

- Page root:
  - `main` class: `min-h-screen bg-gray-50 px-4 py-10 sm:px-6`
- Card wrapper:
  - `div` class: `mx-auto max-w-6xl rounded-lg border border-gray-200 bg-white p-6`
- Table container:
  - `div` class: `mt-6 overflow-x-auto`

## 3) Table classes

- `<table>`: `min-w-full divide-y divide-gray-200 text-sm`
- `<thead>`: `bg-gray-50`
- `<tbody>`: `divide-y divide-gray-100 bg-white`
- `<th>` (all columns): `px-4 py-3 text-left font-semibold text-gray-700`
- `<td>` Date: `px-4 py-3 text-gray-700`
- `<td>` Numeric cells: `px-4 py-3 text-gray-900`

## 4) Column order

1. Date
2. Product Cost (£)
3. Shipping (£)
4. Payment (%)
5. Revenue (£)
6. Profit (£)
7. Margin (%)

## 5) Numeric formatting logic

- Date:
  - `dateFormatter.format(new Date(snapshot.created_at))`
- Currency columns:
  - `currencyFormatter.format(toNumber(...))`
- Percent columns:
  - `toNumber(...).toFixed(2) + "%"`

Helpers in same file:
- `toNumber(value) => Number(value) || 0`
- `currencyFormatter = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 })`
- `dateFormatter = new Intl.DateTimeFormat("en-GB", { day, month, year, hour, minute })`

## 6) Navigation element status in Dashboard page

No back-navigation button/link is rendered in `app/dashboard/page.tsx`.
No `router.push("/")`, `Link href="/"`, or `history.back()` calls are present in this file.
