/**
 * Friendly budget categories with mapping from Plaid's PFC enum
 * (and looser legacy categories) to a small, intuitive set.
 *
 * Used for: budget setup, category breakdowns, top-merchant grouping.
 */

export type BudgetCategoryKey =
  | "food"
  | "transportation"
  | "shopping"
  | "bills"
  | "entertainment"
  | "health"
  | "travel"
  | "personal"
  | "subscriptions"
  | "transfers"
  | "other";

export interface BudgetCategoryDef {
  key: BudgetCategoryKey;
  label: string;
  emoji: string;
  /** Tailwind text color class for accents */
  color: string;
  /** HSL-ish hex used for bars/charts */
  hex: string;
  /** Whether spending in this category should count toward "real" spend */
  countsAsSpend: boolean;
  description: string;
}

export const BUDGET_CATEGORIES: BudgetCategoryDef[] = [
  {
    key: "food",
    label: "Food & Dining",
    emoji: "🍽️",
    color: "text-orange-500",
    hex: "#f97316",
    countsAsSpend: true,
    description: "Groceries, restaurants, coffee, delivery",
  },
  {
    key: "transportation",
    label: "Transportation",
    emoji: "🚗",
    color: "text-blue-500",
    hex: "#3b82f6",
    countsAsSpend: true,
    description: "Gas, rideshare, transit, parking",
  },
  {
    key: "shopping",
    label: "Shopping",
    emoji: "🛍️",
    color: "text-pink-500",
    hex: "#ec4899",
    countsAsSpend: true,
    description: "Clothes, electronics, home goods",
  },
  {
    key: "bills",
    label: "Bills & Utilities",
    emoji: "⚡",
    color: "text-yellow-500",
    hex: "#eab308",
    countsAsSpend: true,
    description: "Rent, electric, internet, phone",
  },
  {
    key: "entertainment",
    label: "Entertainment",
    emoji: "🎬",
    color: "text-purple-500",
    hex: "#a855f7",
    countsAsSpend: true,
    description: "Movies, games, events, hobbies",
  },
  {
    key: "health",
    label: "Health & Fitness",
    emoji: "🏥",
    color: "text-emerald-500",
    hex: "#10b981",
    countsAsSpend: true,
    description: "Doctor, gym, pharmacy, wellness",
  },
  {
    key: "travel",
    label: "Travel",
    emoji: "✈️",
    color: "text-cyan-500",
    hex: "#06b6d4",
    countsAsSpend: true,
    description: "Flights, hotels, trips",
  },
  {
    key: "personal",
    label: "Personal Care",
    emoji: "💅",
    color: "text-rose-500",
    hex: "#f43f5e",
    countsAsSpend: true,
    description: "Haircuts, beauty, self-care",
  },
  {
    key: "subscriptions",
    label: "Subscriptions",
    emoji: "🔁",
    color: "text-indigo-500",
    hex: "#6366f1",
    countsAsSpend: true,
    description: "Streaming, software, memberships",
  },
  {
    key: "transfers",
    label: "Transfers & Loans",
    emoji: "💳",
    color: "text-slate-500",
    hex: "#64748b",
    countsAsSpend: false,
    description: "Account transfers, loan payments",
  },
  {
    key: "other",
    label: "Other",
    emoji: "⚪",
    color: "text-muted-foreground",
    hex: "#94a3b8",
    countsAsSpend: true,
    description: "Everything else",
  },
];

const BY_KEY = new Map(BUDGET_CATEGORIES.map(c => [c.key, c] as const));

export function getCategoryDef(key: string | null | undefined): BudgetCategoryDef {
  if (!key) return BY_KEY.get("other")!;
  // accept either friendly key or label
  const direct = BY_KEY.get(key as BudgetCategoryKey);
  if (direct) return direct;
  const byLabel = BUDGET_CATEGORIES.find(c => c.label.toLowerCase() === key.toLowerCase());
  return byLabel ?? BY_KEY.get("other")!;
}

/**
 * Map a raw Plaid (or legacy) category to one of our friendly keys.
 * Plaid Personal Finance Categories are uppercase enums like "FOOD_AND_DRINK".
 * Older Plaid txns may use mixed-case strings ("Food and Drink").
 */
export function plaidCategoryToBudgetKey(
  category: string | null | undefined,
  detailed?: string | null,
): BudgetCategoryKey {
  if (!category) return "other";
  const norm = String(category).toUpperCase().replace(/[\s-]+/g, "_");
  const det = (detailed ?? "").toUpperCase();

  // Subscriptions are detected separately; if a txn is part of a recurring stream,
  // callers can override with "subscriptions". This map handles raw category only.
  switch (norm) {
    case "FOOD_AND_DRINK":
    case "FOOD_AND_DRINK_GROCERIES":
    case "FOOD_AND_DRINK_RESTAURANTS":
      return "food";
    case "TRANSPORTATION":
    case "TRAVEL_TRANSPORTATION":
      return "transportation";
    case "TRAVEL":
      return "travel";
    case "GENERAL_MERCHANDISE":
    case "GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES":
    case "GENERAL_MERCHANDISE_ELECTRONICS":
    case "HOME_IMPROVEMENT":
      return "shopping";
    case "RENT_AND_UTILITIES":
    case "RENT_AND_UTILITIES_RENT":
    case "RENT_AND_UTILITIES_GAS_AND_ELECTRICITY":
    case "RENT_AND_UTILITIES_INTERNET_AND_CABLE":
    case "RENT_AND_UTILITIES_TELEPHONE":
    case "RENT_AND_UTILITIES_WATER":
      return "bills";
    case "ENTERTAINMENT":
      return "entertainment";
    case "MEDICAL":
    case "PERSONAL_CARE":
      return det.includes("FITNESS") ? "health" : norm === "MEDICAL" ? "health" : "personal";
    case "GENERAL_SERVICES":
      return "other";
    case "TRANSFER_IN":
    case "TRANSFER_OUT":
    case "LOAN_PAYMENTS":
    case "BANK_FEES":
      return "transfers";
    case "GOVERNMENT_AND_NON_PROFIT":
    case "INCOME":
      return "other";
    default:
      // best-effort fuzzy match against label words
      const lc = norm.toLowerCase();
      if (lc.includes("food") || lc.includes("drink") || lc.includes("dining")) return "food";
      if (lc.includes("transport") || lc.includes("uber") || lc.includes("gas")) return "transportation";
      if (lc.includes("shop") || lc.includes("merchand")) return "shopping";
      if (lc.includes("bill") || lc.includes("utilit") || lc.includes("rent")) return "bills";
      if (lc.includes("entertain")) return "entertainment";
      if (lc.includes("health") || lc.includes("medic")) return "health";
      if (lc.includes("travel")) return "travel";
      if (lc.includes("subscri")) return "subscriptions";
      if (lc.includes("transfer") || lc.includes("loan") || lc.includes("fee")) return "transfers";
      return "other";
  }
}

export function categorizeTransaction(tx: {
  category?: string | null;
  category_detailed?: string | null;
  is_recurring?: boolean | null;
  recurring_stream_id?: string | null;
}): BudgetCategoryKey {
  if (tx.is_recurring || tx.recurring_stream_id) return "subscriptions";
  return plaidCategoryToBudgetKey(tx.category ?? null, tx.category_detailed ?? null);
}
