export type LinkedAccountStatus = "connected" | "connect" | "relink";

export type LinkedAccount = {
  name: string;
  type: string;
  balance: string;
  status: LinkedAccountStatus;
  lastSync: string;
};

export type RecurringWatchItem = {
  merchant: string;
  amount: string;
  status: string;
  action: string;
};

export type CashFlowSignal = {
  label: string;
  value: string;
  delta: string;
  tone: "good" | "warn";
};

export type UpcomingBill = {
  vendor: string;
  amount: string;
  due: string;
  status: string;
};

export type SpendingSegment = {
  label: string;
  value: number;
  color: string;
};

export type TimeRange = {
  label: string;
  value: string;
  description?: string;
};

export const linkedAccounts: LinkedAccount[] = [
  { name: "Chase Checking", type: "Primary", balance: "$4,820", status: "connected", lastSync: "2m ago" },
  { name: "Amex Gold", type: "Credit", balance: "-$1,240", status: "connected", lastSync: "5m ago" },
  { name: "Robinhood", type: "Investments", balance: "$12,450", status: "connect", lastSync: "Connect with Plaid" },
  { name: "Venmo", type: "Wallet", balance: "$180", status: "relink", lastSync: "Relink required" }
];

export const recurringWatchlist: RecurringWatchItem[] = [
  { merchant: "Apple One", amount: "$31.90/mo", status: "Due Apr 29", action: "Pause suggestion" },
  { merchant: "Notion", amount: "$18.00/mo", status: "Annual save $24", action: "Switch billing" },
  { merchant: "Hulu", amount: "$12.99/mo", status: "Unused 3 weeks", action: "Cancel in-app" }
];

export const cashFlowSignals: CashFlowSignal[] = [
  { label: "Cash on hand", value: "$18,230", delta: "+$620", tone: "good" },
  { label: "MTD spending", value: "$3,420", delta: "-8% vs last month", tone: "good" },
  { label: "Upcoming bills", value: "$2,140", delta: "$640 due this week", tone: "warn" }
];

export const upcomingBills: UpcomingBill[] = [
  { vendor: "Workspace Lease", amount: "$1,280.00", due: "May 1", status: "Auto-pay" },
  { vendor: "Cloud Services", amount: "$310.00", due: "May 3", status: "Review" },
  { vendor: "Design Tools", amount: "$42.00", due: "Apr 28", status: "Scheduled" }
];

export const spendingInsights: SpendingSegment[] = [
  { label: "Essentials", value: 38, color: "var(--primary)" },
  { label: "Growth", value: 22, color: "var(--chart-1, #34d399)" },
  { label: "Lifestyle", value: 18, color: "var(--chart-2, #60a5fa)" },
  { label: "Savings", value: 22, color: "var(--chart-3, #fbbf24)" }
];

export const monthlySpending: number[] = [620, 540, 580, 610, 560, 640, 590, 630, 670, 610, 580, 550];

export const timeRanges: TimeRange[] = [
  { label: "MTD", value: "mtd", description: "Month to date" },
  { label: "QTD", value: "qtd", description: "Quarter view" },
  { label: "YTD", value: "ytd", description: "Annualized" }
];
