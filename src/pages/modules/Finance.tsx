import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileFinanceView } from "@/components/mobile/views/MobileFinanceView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFinancePersistence } from "@/hooks/useFinancePersistence";
import { 
  PlaidLinkButton, 
  AddTransactionDialog, 
  AddSubscriptionDialog, 
  AddGiftCardDialog, 
  AddBudgetDialog,
  BudgetOverviewCard,
  BudgetCategoryRow,
  BudgetSetupWizard,
  BudgetInsightsPanel,
  TopMerchantsCard,
} from "@/components/finance";
import { 
  Building2, CreditCard, PiggyBank, TrendingUp, RefreshCw, 
  Plus, Wallet, Gift, BarChart3, ArrowUpRight, ArrowDownRight,
  Calendar, AlertCircle, ChevronRight, ArrowLeft, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useBudgetData } from "@/hooks/useBudgetData";
import { useBudgetInsights } from "@/hooks/useBudgetInsights";
import { categorizeTransaction, getCategoryDef } from "@/lib/finance/categories";

export default function Finance() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("overview");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [giftCards, setGiftCards] = useState<any[]>([]);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const finance = useFinancePersistence();

  useEffect(() => {
    document.title = "Finance | Arlo";
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [accts, txns, subs, cards, stocks] = await Promise.all([
        finance.getLinkedAccounts(),
        finance.getTransactions({ limit: 50 }),
        finance.getSubscriptions(),
        finance.getGiftCards(),
        finance.getWatchlist(),
      ]);
      setAccounts(accts);
      setTransactions(txns);
      setSubscriptions(subs);
      setGiftCards(cards);
      setWatchlist(stocks);
    } catch (error) {
      console.error("Failed to load finance data:", error);
    } finally {
      setLoading(false);
    }
  }, [finance]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await finance.syncTransactions();
      await finance.refreshBalances();
      await loadData();
      toast.success("Accounts synced");
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };
  // Calculate summary stats — exclude transfers/loans from "spending"
  const totalBalance = accounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);
  const monthStart = startOfMonth(new Date()).toISOString().split('T')[0];
  const monthEnd = endOfMonth(new Date()).toISOString().split('T')[0];
  const monthlyTransactions = transactions.filter(t => t.date >= monthStart && t.date <= monthEnd);
  const realSpendTxns = monthlyTransactions.filter(t => {
    if (t.amount <= 0) return false;
    return getCategoryDef(categorizeTransaction(t)).countsAsSpend;
  });
  const monthlySpending = realSpendTxns.reduce((sum, t) => sum + t.amount, 0);
  const monthlyIncome = monthlyTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const monthlySubscriptions = subscriptions.filter(s => s.frequency === 'MONTHLY').reduce((sum, s) => sum + s.amount, 0);
  const totalGiftCards = giftCards.reduce((sum, c) => sum + c.current_balance, 0);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  // Mobile view
  if (isMobile) {
    return <MobileFinanceView />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-1 text-xs font-medium transition hover:border-border hover:bg-background/80"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
              </button>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Finance</h1>
            <p className="text-muted-foreground">Your complete financial picture</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              Sync
            </Button>
            <PlaidLinkButton onSuccess={loadData} />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Total Balance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
              <p className="text-xs text-muted-foreground">{accounts.length} linked accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4 text-destructive" />
                This Month Spending
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(monthlySpending)}</p>
              <p className="text-xs text-muted-foreground">{monthlyTransactions.filter(t => t.amount > 0).length} transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                This Month Income
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(monthlyIncome)}</p>
              <p className="text-xs text-muted-foreground">Net: {formatCurrency(monthlyIncome - monthlySpending)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Monthly Subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(monthlySubscriptions)}</p>
              <p className="text-xs text-muted-foreground">{subscriptions.filter(s => s.is_active).length} active</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="giftcards">Gift Cards</TabsTrigger>
            <TabsTrigger value="stocks">Stocks</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Linked Accounts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Linked Accounts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {accounts.length === 0 ? (
                  <div className="text-center py-8">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No accounts linked yet</p>
                    <PlaidLinkButton onSuccess={loadData} />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {accounts.map(account => (
                      <div key={account.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{account.institution_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {account.account_name} ••••{account.account_mask}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(account.current_balance || 0)}</p>
                          {account.error_code && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Needs attention
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Transactions</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("transactions")}>
                    View all <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No transactions yet</p>
                ) : (
                  <div className="space-y-2">
                    {transactions.slice(0, 5).map(tx => (
                      <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium">{tx.merchant_name || tx.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(tx.date), 'MMM d')} • {tx.category || 'Uncategorized'}
                          </p>
                        </div>
                        <p className={`font-semibold ${tx.amount > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                          {tx.amount > 0 ? '-' : '+'}{formatCurrency(Math.abs(tx.amount))}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>All Transactions</CardTitle>
                  <AddTransactionDialog onSuccess={loadData} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {transactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div className="flex-1">
                        <p className="font-medium">{tx.merchant_name || tx.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{format(new Date(tx.date), 'MMM d, yyyy')}</span>
                          {tx.category && <Badge variant="secondary">{tx.category}</Badge>}
                          {tx.pending && <Badge variant="outline">Pending</Badge>}
                        </div>
                      </div>
                      <p className={`font-semibold ${tx.amount > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                        {tx.amount > 0 ? '-' : '+'}{formatCurrency(Math.abs(tx.amount))}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="budget">
            <BudgetTab
              transactions={transactions}
              subscriptions={subscriptions}
              giftCards={giftCards}
            />
          </TabsContent>

          <TabsContent value="subscriptions">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Subscriptions</CardTitle>
                    <CardDescription>Recurring payments detected from your transactions</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => finance.syncRecurring()}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Detect
                    </Button>
                    <AddSubscriptionDialog onSuccess={loadData} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {subscriptions.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-2">No subscriptions detected yet</p>
                    <p className="text-sm text-muted-foreground">Link an account and sync to detect recurring payments</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {subscriptions.map(sub => (
                      <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="font-medium">{sub.merchant_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {sub.frequency} • Next: {sub.next_billing_date ? format(new Date(sub.next_billing_date), 'MMM d') : 'Unknown'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(sub.amount)}</p>
                          {sub.price_increased && (
                            <Badge variant="destructive" className="text-xs">Price increased</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="giftcards">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Gift className="h-5 w-5" />
                      Gift Cards
                    </CardTitle>
                    <CardDescription>Total available: {formatCurrency(totalGiftCards)}</CardDescription>
                  </div>
                  <AddGiftCardDialog onSuccess={loadData} />
                </div>
              </CardHeader>
              <CardContent>
                {giftCards.length === 0 ? (
                  <div className="text-center py-12">
                    <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No gift cards tracked yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {giftCards.map(card => (
                      <Card key={card.id}>
                        <CardContent className="p-4">
                          <p className="font-medium">{card.merchant_name}</p>
                          <p className="text-2xl font-bold mt-2">{formatCurrency(card.current_balance)}</p>
                          <p className="text-sm text-muted-foreground">
                            of {formatCurrency(card.initial_balance)}
                          </p>
                          {card.expiry_date && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Expires: {format(new Date(card.expiry_date), 'MMM d, yyyy')}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stocks">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Watchlist
                    </CardTitle>
                    <CardDescription>Track stocks you're interested in</CardDescription>
                  </div>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Stock
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {watchlist.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Add stocks to your watchlist</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {watchlist.map(stock => (
                      <div key={stock.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="font-bold">{stock.symbol}</p>
                          <p className="text-sm text-muted-foreground">{stock.name}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

interface BudgetTabProps {
  transactions: any[];
  subscriptions: any[];
  giftCards: any[];
}

function BudgetTab({ transactions, subscriptions, giftCards }: BudgetTabProps) {
  const summary = useBudgetData();
  const insights = useBudgetInsights({ summary, subscriptions, transactions, giftCards });
  const [wizardOpen, setWizardOpen] = useState(false);
  const now = new Date();

  if (summary.loading) {
    return <Skeleton className="h-96" />;
  }

  const hasBudgets = summary.categories.length > 0;

  if (!hasBudgets) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <PiggyBank className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <p className="font-medium">No budgets yet</p>
            <p className="text-sm text-muted-foreground">
              Let Arlo suggest budgets from your last 90 days, or add one manually.
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <Button onClick={() => setWizardOpen(true)} className="gap-2">
              <Sparkles className="h-4 w-4" /> Smart setup
            </Button>
            <AddBudgetDialog onSuccess={summary.refresh} />
          </div>
          <BudgetSetupWizard
            open={wizardOpen}
            onOpenChange={setWizardOpen}
            onComplete={summary.refresh}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <BudgetOverviewCard
          totalBudgeted={summary.totalBudgeted}
          totalSpent={summary.totalSpent}
          totalRemaining={summary.totalRemaining}
          pacing={summary.pacing}
          month={now.getMonth() + 1}
          year={now.getFullYear()}
        />

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <PiggyBank className="h-4 w-4" /> Categories
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setWizardOpen(true)} className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Suggest
              </Button>
              <AddBudgetDialog onSuccess={summary.refresh} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.categories.map(cat => (
              <BudgetCategoryRow key={cat.budgetId} category={cat} onChange={summary.refresh} />
            ))}
          </CardContent>
        </Card>

        <TopMerchantsCard merchants={summary.topMerchants} />
      </div>

      <div className="space-y-4">
        <BudgetInsightsPanel insights={insights} />
      </div>

      <BudgetSetupWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onComplete={summary.refresh}
      />
    </div>
  );
}