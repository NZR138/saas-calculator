# SaaS Calculator Baseline

**Project**: UK Profit Calculator (MVP)  
**Stack**: Next.js 16.1 + React 19 + TypeScript + Tailwind CSS + lucide-react  
**Status**: MVP in development

**Stability check (PowerShell-friendly)**: Run `npm run stability`

---

## Architecture Overview

### Project Structure

```
saas-calculator/
├── app/
│   ├── layout.tsx           # Root layout with metadata
│   ├── page.tsx             # Home page (MVP landing)
│   ├── globals.css          # Global Tailwind styles
│   ├── calculator/
│   │   └── page.tsx         # Calculator page route
│   ├── components/
│   │   ├── CalculatorCard.tsx       # Main calculator UI (layout + display logic)
│   │   ├── NumberField.tsx          # Numeric input with validation
│   │   ├── EmailSnapshotModal.tsx   # Email capture modal
│   │   ├── ToggleVat.tsx            # VAT on/off toggle switch
│   │   └── Tooltip.tsx              # Info icon with hover tooltips
│   ├── hooks/
│   │   └── useCalculator.ts         # Core calculator logic (calculations + state)
│   ├── api/                 # (Empty - reserved for future)
│   └── auth/                # (Empty - reserved for future)
├── package.json
├── tsconfig.json
├── next.config.ts
├── eslint.config.mjs
├── postcss.config.mjs
└── README.md
```

### File Responsibilities

#### **Core Logic Layer**

| File | Responsibility |
|------|---|
| `useCalculator.ts` | Centralized calculator state and calculations. Uses `useMemo` to prevent unnecessary recalculations. Exposes values (inputs) and calculated results. |

#### **UI Component Layer**

| File | Responsibility |
|------|---|
| `CalculatorCard.tsx` | Main container component. Owns modal state, feedback analytics. Renders two-column layout (inputs left, results right). Contains inline `Input` and `Result` helper components. |
| `NumberField.tsx` | Isolated numeric input component with digit-only validation, leading-zero removal, and currency prefix support. |
| `ToggleVat.tsx` | Reusable toggle switch for VAT inclusion. Accessible (ARIA role). |
| `Tooltip.tsx` | Simple hover-triggered tooltip for contextual help. |
| `EmailSnapshotModal.tsx` | Modal dialog for email capture. Saves snapshots to localStorage. Integrates with Plausible analytics. |

#### **Pages**

| File | Responsibility |
|------|---|
| `layout.tsx` | Root metadata (SEO titles/descriptions). Global styling wrapper. Declares Plausible script. |
| `page.tsx` | Home page with MVP landing message. Not yet a full landing page. |
| `calculator/page.tsx` | Calculator page container. Renders `CalculatorCard` centered. |

---

## Calculator Logic Flow

### State Management

All state is managed in `useCalculator.ts` hook using React's `useState` and `useMemo`.

**Input values** (user-controlled):
- `users` — number of paying customers
- `price` — monthly price per user (£)
- `fixedCosts` — fixed monthly costs (£)
- `adSpend` — monthly ad spend (£)
- `vatIncluded` — toggle for VAT calculation (boolean)

**Calculated values** (derived from inputs, memoized):
- `revenue` = users × price
- `vatAmount` = revenue × 0.2 if `vatIncluded` is true, else 0
- `totalCosts` = fixedCosts + adSpend + vatAmount
- `profit` = revenue − totalCosts
- `margin` = (profit ÷ revenue) × 100 (or 0 if revenue is 0)
- `roas` = revenue ÷ adSpend (or 0 if adSpend is 0)

### Data Flow

```
User Input → CalculatorCard.setValue() 
  → useCalculator.setValues() 
  → useMemo calculates results 
  → CalculatorCard displays Results
```

**Example**:
1. User enters "100" in "Paying users" input
2. `CalculatorCard` calls `setValue("users", 100)`
3. `useCalculator` updates state: `values.users = 100`
4. `useMemo` dependency triggers (users changed)
5. All calculations run: `revenue = 100 * price`, `profit = revenue - costs`, etc.
6. `CalculatorCard` re-renders with new calculated values

### Analytics Integration

- **Feedback buttons**: Plausible events `feedback_yes` / `feedback_no`
- **Email submit**: Plausible event `email_submit`
- **Analytics script**: Declared in `layout.tsx` via inline `<script>` tag pointing to Plausible

### Email Snapshot Flow

1. User clicks "Check what these numbers might be missing" (only enabled if revenue > 0)
2. Modal opens showing current snapshot values
3. User enters email and clicks "Send me the explanation"
4. Email validation checks for `@` symbol
5. Payload saved to localStorage at key `"uk-profit-calculator:snapshots"`
6. Success message shown, modal closes after 1000ms

---

## Design Decisions

### 1. **Hook-Based State Management**
- ✅ Single `useCalculator` hook provides all state and calculations
- Reason: Simple MVP without Redux/Zustand complexity
- Easy to migrate to context or external state later

### 2. **Memoized Calculations**
- `useMemo` prevents recalculations on every render
- Dependency array: `[values]` triggers only when input values change
- Reason: Ensures performance even with complex formulas

### 3. **Component Cohabitation in CalculatorCard**
- `Input` and `Result` helper components defined inline in `CalculatorCard.tsx`
- Reason: They are tightly coupled UI helpers, not reusable elsewhere (yet)
- Trade-off: Reduces file count but makes the file longer

### 4. **Numeric Input Validation**
- `NumberField.tsx` uses controlled component with custom normalization
- Blocks non-digit characters at keystroke level
- Removes leading zeros on blur
- Reason: Prevents user confusion with invalid input formats

### 5. **VAT Hard-Coded to 20%**
- VAT calculation: `revenue * 0.2`
- Not parameterized
- Reason: UK-specific calculator; 20% is the standard VAT rate

### 6. **Modal Email Storage**
- Snapshots stored in **localStorage**, not sent to server
- No backend endpoint (yet)
- Reason: MVP phase; future refactor will add email service integration

### 7. **Two-Column Layout**
- Left: Inputs + insights box + feedback
- Right: Results + ROAS metric + feedback box
- Responsive: Stacks on mobile (`grid-cols-1 md:grid-cols-2`)
- Reason: Clear visual separation of inputs and outputs

### 8. **Tooltip Implementation**
- Hover-only tooltips (`onMouseEnter` / `onMouseLeave`)
- No touch support for mobile
- Reason: MVP simplicity; may need touch-friendly version later

### 9. **Plausible Analytics Over GA**
- Privacy-focused, cookie-less analytics
- Events tracked: feedback, email submit
- Script declared in layout as separate inline script tag
- Reason: User privacy + simplicity

---

## Known Issues & Limitations

### 1. **Tooltip Mobile/Touch Support**
- **Issue**: Tooltips use `onMouseEnter/Leave`, not accessible on touch devices
- **Impact**: Mobile users can't see tooltip content
- **Priority**: Medium (affects user education on mobile)
- **Future Fix**: Detect touch and use tap-to-reveal instead

### 2. **ROAS Division by Zero**
- **Current**: `roas = adSpend > 0 ? revenue / adSpend : 0`
- **Issue**: Returns 0 when adSpend is 0, but should probably show "—" or "N/A"
- **Impact**: Confusing UX (0x implies zero return on ad spend)
- **Future Fix**: Return `null` or special value, handle display in Result component

### 3. **Modal Email Validation**
- **Current**: Only checks for `@` symbol (naive validation)
- **Issue**: Accepts invalid emails like "test@" or "@test.com"
- **Impact**: Garbage data in localStorage
- **Future Fix**: Use proper email regex or server-side validation

### 4. **No Email Sending**
- **Current**: Snapshots saved to localStorage only
- **Issue**: User expects email to be sent (button says "Send me the explanation")
- **Impact**: Broken user expectation; no actual email delivery
- **Priority**: Critical for MVP (users rely on this feature)
- **Future Fix**: Integrate email service (SendGrid, Mailgun, etc.)

### 5. **Analytics Script Domain Placeholder**
- **Current**: `data-domain="yourdomain.com"` in layout.tsx
- **Issue**: Not configured for actual domain
- **Impact**: Plausible events may not track correctly
- **Future Fix**: Replace with actual domain or move to environment variable

### 6. **No Error Boundary**
- **Current**: No error boundaries in component tree
- **Issue**: Single component error could crash entire app
- **Impact**: Poor production resilience
- **Future Fix**: Add error boundaries at layout and CalculatorCard level

### 7. **Fixed Margin Calculation**
- **Current**: `margin = (profit / revenue) * 100`
- **Issue**: Returns 0 when revenue is 0, but could be negative (losses)
- **Impact**: Can't distinguish between breakeven (0) and loss (negative)
- **Known Edge Case**: Handled as "0% margin" in display; may confuse users

### 8. **No Input Persistence**
- **Current**: Calculator state resets on page refresh
- **Issue**: User loses calculation if they refresh or close tab
- **Impact**: Frustration on second visit
- **Future Fix**: Save to localStorage or URL params (shareable links)

### 9. **Insights Box Static Content**
- **Current**: Hard-coded list of hidden costs and "25–45% lower" claim
- **Issue**: Not personalized to user's scenario
- **Impact**: May not apply to all business types
- **Future Fix**: Calculate dynamic insights based on inputs

### 10. **Layout Assumes Centered Container**
- **Current**: No max-width constraint in CalculatorPage
- **Issue**: On large screens, layout stretches too wide
- **Impact**: Poor readability on 4K+ displays
- **Future Fix**: Add `max-w-6xl mx-auto` or similar constraint

---

## Must NOT Be Changed in Future Refactors

### 🔴 **Critical Constraints**

#### 1. **VAT Calculation Logic**
```typescript
const vatAmount = values.vatIncluded ? revenue * 0.2 : 0;
```
- **Why immutable**: Legal/financial accuracy
- **Impact**: Any change could break regulatory compliance
- **Exception**: Only if UK VAT rate changes (unlikely)

#### 2. **Calculator Input Fields (Exact Names)**
- `users` — must remain for ROAS calculation
- `price` — must remain for revenue calculation
- `fixedCosts` — foundational for profit calculation
- `adSpend` — required for ROAS metric
- `vatIncluded` — toggles entire VAT subsystem

**Why**: External references may depend on these property names (API contracts, localStorage keys, etc.)

#### 3. **Output Metrics Order**
The right column displays metrics in this exact order:
1. Revenue
2. Total Costs
3. VAT Amount
4. **Profit** (highlighted in green)
5. Margin
6. ROAS

**Why**: User research (if any) may have determined this order for comprehension. Changing it could break UX flow.

#### 4. **UK Profit Calculator Title**
- **Current**: "UK Profit Calculator"
- **Why immutable**: Brand identity, SEO, external links
- **Where**: Appears in `CalculatorCard.tsx` and metadata

#### 5. **Plausible Analytics Integration**
- Event names: `feedback_yes`, `feedback_no`, `email_submit`
- **Why immutable**: Analytics dashboard depends on exact event names
- **Data integrity**: Historical data tied to these names

#### 6. **localStorage Key for Snapshots**
```typescript
const key = "uk-profit-calculator:snapshots";
```
- **Why immutable**: User data stored under this key
- **Impact**: Changing key = data loss
- **Exception**: Only if migrating to backend (would need data migration script)

#### 7. **Hook Export Structure**
`useCalculator` must export:
```typescript
return {
  values,         // Input state
  setValue,       // State setter
  revenue, totalCosts, vatAmount, profit, margin, roas  // Calculated results
}
```
**Why**: `CalculatorCard` destructures these exact properties. Changing structure requires refactoring the consumer.

#### 8. **Component "Use Client" Directives**
All components in `/components` and `/hooks` must remain `"use client"`:
- `CalculatorCard.tsx`
- `useCalculator.ts`
- `NumberField.tsx`
- `ToggleVat.tsx`
- `Tooltip.tsx`
- `EmailSnapshotModal.tsx`

**Why**: They manage client-side state and interactivity. Removing would break functionality.

#### 9. **Metadata (SEO Title & Description)**
```
Title: "UK Profit Calculator — real profit after VAT, ads and costs"
Description: "UK Profit Calculator helps you calculate real monthly profit after VAT, advertising spend and fixed costs..."
```
**Why immutable**: SEO ranking, external links, user expectations

#### 10. **Currency Format (£ with 2 decimals)**
All money displays use `.toFixed(2)` and `£` prefix.
```typescript
`£${revenue.toFixed(2)}`
```
**Why**: UK locale standard; changing to other currency would be breaking change

---

## Technology Stack (Not to be Changed Lightly)

| Purpose | Library | Version | Notes |
|---------|---------|---------|-------|
| Framework | Next.js | 16.1.4 | App Router required for server/client separation |
| UI Library | React | 19.2.3 | Must match Next.js 16 compatibility |
| Styling | Tailwind CSS | 4 | No CSS modules in use; inline utility classes |
| Icons | lucide-react | 0.563.0 | Only used for potential future UI enhancements |
| Analytics | Plausible | — | Via external CDN script |
| Type Safety | TypeScript | 5 | Strict mode enabled |

---

## Future Refactoring Roadmap (Hints for Next Phase)

### Phase 2 Candidates (Do Not Start Until Baseline Approved)
- [ ] Email service integration (SendGrid/Mailgun)
- [ ] Shareable snapshot URLs with query params
- [ ] localStorage → localStorage + URL state syncing
- [ ] Dynamic insights based on input percentages
- [ ] Touch-friendly tooltips
- [ ] Error boundaries
- [ ] Dark mode toggle
- [ ] More metrics (payback period, customer acquisition cost, etc.)

### Phase 3 Candidates
- [ ] Backend API for user accounts
- [ ] Database for snapshots and email lists
- [ ] Email templates (HTML)
- [ ] User authentication
- [ ] Comparison mode (multiple scenarios)

---

## Summary

The **SaaS Calculator MVP** is a simple, focused tool for UK-based SaaS founders to estimate real profit after VAT and marketing spend. It features:

✅ **Single-responsibility hook** for calculations  
✅ **Memoized calculations** for performance  
✅ **Simple component hierarchy** (no context/Redux needed yet)  
✅ **localStorage snapshots** for MVP email capture  
✅ **Plausible analytics** for usage tracking  
✅ **Tailwind-only styling** for rapid iteration  
✅ **TypeScript** for type safety  

⚠️ **Known gaps**: Email not actually sent, mobile tooltips broken, no persistence, analytics domain not set.

🔒 **Locked constraints**: VAT logic, input field names, output metrics, calculator title, localStorage key structure, client-side markers, metadata, currency format.

This baseline must be reviewed and approved before any refactoring begins.
