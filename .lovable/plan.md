
# Make /finance Budget Actually Help You Spend Less

## The problem today

The Budget tab is essentially empty — it just shows an "Add your first budget" CTA. Even when you add a budget, nothing connects it to your real Plaid transactions because the dialog's category list ("Food & Dining", "Shopping"…) doesn't match the categories Plaid actually returns ("FOOD_AND_DRINK", "GENERAL_MERCHANDISE"…). So `spent` stays at 0 forever and budgets feel like dead data.

The other big gap: there's no insight. You see a number for "This Month Spending" at the top, but nothing tells you **where** money is going, **whether you're on pace**, or **what to do about it**.

## What we're building

A budget experience structured around three jobs:
1. **See where money is going** — clear category breakdown with real Plaid data
2. **Know if you're on pace** — pacing math, not just totals
3. **Get nudges to spend less** — concrete, personalized suggestions

### 1. Smart category system

Replace the broken hardcoded category list with a normalized mapping of Plaid's enum categories to friendly labels with icons and colors (Food & Dining 🍽, Transportation 🚗, Shopping 🛍, Bills & Utilities ⚡, Entertainment 🎬, Health 🏥, Travel ✈, Personal 💅, Subscriptions 🔁, Transfers/Loans 💳, Other ⚪).

When you create a budget, you pick from these friendly categories. Behind the scenes we know which Plaid categories roll up into each, so `spent` is calculated live from your actual transactions.

### 2. New Budget dashboard

```text
┌─ Monthly Budget — November ─────────── [Edit categories] ─┐
│  $2,140 of $4,200 spent           Day 12 of 30            │
│  ████████░░░░░░░░░░  51%          On pace: 40% expected   │
│  ⚠ Spending 11% faster than planned                       │
└────────────────────────────────────────────────────────────┘

┌─ Categories ──────────────────────────────────────────────┐
│  🍽 Food & Dining     $514 / $600    ███████░░  86% ⚠   │
│  🚗 Transportation    $411 / $400    ██████████ 103% 🔴  │
│  🛍 Shopping          $285 / $500    █████░░░░░ 57%      │
│  🔁 Subscriptions     $89  / $100    █████████░ 89%      │
│  ⚡ Bills             $0   / $1500   ░░░░░░░░░░ 0%       │
│  + Add category                                           │
└────────────────────────────────────────────────────────────┘

┌─ Insights & nudges ───────────────────────────────────────┐
│  💡 You spent $89 more on dining this month than last     │
│  💡 Cancel unused: Hulu hasn't been billed in 60 days    │
│  💡 Set an envelope for travel ($420 saved gift cards)   │
└────────────────────────────────────────────────────────────┘

┌─ Top merchants this month ────────────────────────────────┐
│  Uber Eats    $187   12 orders   [Set merchant cap]      │
│  Amazon       $142    7 orders                           │
│  Shell        $98     4 visits                           │
└────────────────────────────────────────────────────────────┘
```

**Pacing math**: if today is day 12/30 and you've spent 51% of budget, expected is 40% — flag as "11% over pace." Color-coded: green (under pace), amber (near pace), red (over pace or over budget).

### 3. Quick budget setup

A first-run "Set up your budget in 60 seconds" flow:
- Looks at last 90 days of spend per category
- Suggests a budget = avg monthly spend rounded down 10% (so the goal is to spend less)
- One-tap **Apply suggestions** to create budgets for top 6 categories at once
- Switch to manual editing anytime

### 4. Proactive nudges (the "spend less" part)

A `useBudgetInsights` hook that surfaces actionable items:
- **Overspend alert**: any category over 90% mid-month → push notification + dashboard nudge
- **Subscription bloat**: subscriptions you haven't used (no related merchant txns in 60d)
- **Merchant trends**: if a merchant's spend is up >25% MoM, suggest a cap
- **Carryover wins**: when you finish a month under budget, celebrate and offer to roll savings to a goal/envelope
- **Free money**: gift card balances usable at top merchants you spent at

### 5. Polish that makes it usable

- **Edit/delete budgets** from the row (currently you can create but not manage)
- **Carryover** properly applied to next month's effective budget
- **Income vs. spending split** so the top "$ this month" cards distinguish takeouts vs. transfers/loans (right now `LOAN_PAYMENTS` and `TRANSFER_OUT` inflate spend dramatically)
- **Hide transfers** toggle in the spending calculation
- **Budget widget on dashboard** — small "On pace / Over by $X" status chip

## Technical implementation

**Files to create**
- `src/lib/finance/categories.ts` — Plaid → friendly category map, icons, colors, transfer/loan exclusion
- `src/lib/finance/budgetMath.ts` — pacing, projection, carryover, period helpers
- `src/hooks/useBudgetData.ts` — joins budgets + transactions, returns per-category state with `spent`, `pace`, `status`, `projected`
- `src/hooks/useBudgetInsights.ts` — generates nudge list from budgets, txns, subscriptions, gift cards
- `src/components/finance/BudgetOverviewCard.tsx` — header summary with pacing
- `src/components/finance/BudgetCategoryRow.tsx` — single category row with progress, edit/delete
- `src/components/finance/BudgetSetupWizard.tsx` — 60-second guided setup
- `src/components/finance/BudgetInsightsPanel.tsx` — nudge feed
- `src/components/finance/TopMerchantsCard.tsx` — merchant breakdown with caps
- `src/components/finance/EditBudgetDialog.tsx` — edit/delete existing budget

**Files to modify**
- `src/components/finance/AddBudgetDialog.tsx` — use friendly categories from map
- `src/pages/modules/Finance.tsx` — replace empty Budget tab with new components; fix monthly spending calc to optionally exclude transfers/loans
- `src/hooks/useFinancePersistence.ts` — already has CRUD; add `getCategorySpend(month, year)` helper

**Database** — existing `finance_budgets` schema is sufficient (category, amount, month, year, spent, carryover_enabled, carryover_amount). No migration needed. We'll compute `spent` on the client from `finance_transactions` so it's always live, but also write it back periodically for history.

**Notifications** — overspend alerts hook into the existing `useNotificationTriggers` system (no new infra).

## Out of scope (for now)

- AI-generated weekly spending review (could come later via Lovable AI)
- Multi-month forecasting
- Shared/household budgets
- Goal-based savings envelopes (mentioned but kept as a future follow-up)
