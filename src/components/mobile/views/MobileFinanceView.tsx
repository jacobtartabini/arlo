import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Calendar,
  RefreshCw,
  Plus,
  ChevronRight,
  Gift,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useFinancePersistence } from "@/hooks/useFinancePersistence";
import { PlaidLinkButton, AddTransactionDialog } from "@/components/finance";
import { toast } from "sonner";
import { MobilePageLayout } from "../MobilePageLayout";

export function MobileFinanceView() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [giftCards, setGiftCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeSheet, setActiveSheet] = useState<"transactions" | "subscriptions" | "giftcards" | null>(null);

  const finance = useFinancePersistence();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [accts, txns, subs, cards] = await Promise.all([
        finance.getLinkedAccounts(),
        finance.getTransactions({ limit: 50 }),
        finance.getSubscriptions(),
        finance.getGiftCards(),
      ]);
      setAccounts(accts);
      setTransactions(txns);
      setSubscriptions(subs);
      setGiftCards(cards);
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

  // Calculate summary stats
  const totalBalance = accounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);
  const monthStart = startOfMonth(new Date()).toISOString().split('T')[0];
  const monthEnd = endOfMonth(new Date()).toISOString().split('T')[0];
  const monthlyTransactions = transactions.filter(t => t.date >= monthStart && t.date <= monthEnd);
  const monthlySpending = monthlyTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const monthlyIncome = monthlyTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const monthlySubscriptions = subscriptions.filter(s => s.frequency === 'MONTHLY').reduce((sum, s) => sum + s.amount, 0);
  const totalGiftCards = giftCards.reduce((sum, c) => sum + c.current_balance, 0);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  if (loading) {
    return (
      <MobilePageLayout title="Finance" subtitle="Your financial overview">
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </MobilePageLayout>
    );
  }

  return (
    <MobilePageLayout 
      title="Finance"
      subtitle="Your financial overview"
      headerRight={
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9"
          onClick={handleSync}
          disabled={syncing}
        >
          <RefreshCw className={cn("h-5 w-5", syncing && "animate-spin")} />
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10"
        >
          <p className="text-sm text-muted-foreground mb-1">Total Balance</p>
          <p className="text-4xl font-bold mb-2">{formatCurrency(totalBalance)}</p>
          <p className="text-sm text-muted-foreground">
            {accounts.length} linked account{accounts.length !== 1 ? 's' : ''}
          </p>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl bg-card border border-border/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownRight className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Spending</span>
            </div>
            <p className="text-xl font-bold text-destructive">{formatCurrency(monthlySpending)}</p>
            <p className="text-xs text-muted-foreground">This month</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl bg-card border border-border/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Income</span>
            </div>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(monthlyIncome)}</p>
            <p className="text-xs text-muted-foreground">This month</p>
          </motion.div>
        </div>

        {/* Quick Action Cards */}
        <div className="space-y-3">
          {/* Transactions */}
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => setActiveSheet("transactions")}
            className="w-full p-4 rounded-xl bg-card border border-border/50 text-left active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Transactions</h3>
                  <p className="text-sm text-muted-foreground">
                    {transactions.length} recent
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </motion.button>

          {/* Subscriptions */}
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            onClick={() => setActiveSheet("subscriptions")}
            className="w-full p-4 rounded-xl bg-card border border-border/50 text-left active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-500/10">
                  <Calendar className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-medium">Subscriptions</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(monthlySubscriptions)}/mo
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {subscriptions.filter(s => s.is_active).length} active
                </Badge>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </motion.button>

          {/* Gift Cards */}
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => setActiveSheet("giftcards")}
            className="w-full p-4 rounded-xl bg-card border border-border/50 text-left active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-pink-500/10">
                  <Gift className="h-5 w-5 text-pink-500" />
                </div>
                <div>
                  <h3 className="font-medium">Gift Cards</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(totalGiftCards)} available
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {giftCards.length}
                </Badge>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </motion.button>
        </div>

        {/* Connect Account */}
        {accounts.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="p-6 rounded-2xl border border-dashed bg-muted/20 text-center"
          >
            <Wallet className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="font-medium mb-2">Connect Your Bank</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Link your accounts to track spending automatically
            </p>
            <PlaidLinkButton onSuccess={loadData} />
          </motion.div>
        )}
      </div>

      {/* Transactions Sheet */}
      <Sheet open={activeSheet === "transactions"} onOpenChange={() => setActiveSheet(null)}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Transactions
              </span>
              <AddTransactionDialog onSuccess={loadData} />
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-2 overflow-auto max-h-[calc(80vh-100px)]">
            {transactions.map((tx) => (
              <div 
                key={tx.id} 
                className="flex items-center justify-between p-3 rounded-xl bg-muted/30"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{tx.merchant_name || tx.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(tx.date), 'MMM d')} • {tx.category || 'Uncategorized'}
                  </p>
                </div>
                <p className={cn(
                  "font-semibold",
                  tx.amount > 0 ? 'text-destructive' : 'text-emerald-600'
                )}>
                  {tx.amount > 0 ? '-' : '+'}{formatCurrency(Math.abs(tx.amount))}
                </p>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Subscriptions Sheet */}
      <Sheet open={activeSheet === "subscriptions"} onOpenChange={() => setActiveSheet(null)}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Subscriptions
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-2 overflow-auto max-h-[calc(80vh-100px)]">
            {subscriptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No subscriptions detected</p>
              </div>
            ) : (
              subscriptions.map((sub) => (
                <div 
                  key={sub.id} 
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30"
                >
                  <div>
                    <p className="font-medium">{sub.merchant_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {sub.frequency} • Next: {sub.next_billing_date ? format(new Date(sub.next_billing_date), 'MMM d') : 'Unknown'}
                    </p>
                  </div>
                  <p className="font-semibold">{formatCurrency(sub.amount)}</p>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Gift Cards Sheet */}
      <Sheet open={activeSheet === "giftcards"} onOpenChange={() => setActiveSheet(null)}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Gift Cards
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-2 overflow-auto max-h-[calc(80vh-100px)]">
            {giftCards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Gift className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No gift cards tracked</p>
              </div>
            ) : (
              giftCards.map((card) => (
                <div 
                  key={card.id} 
                  className="p-4 rounded-xl bg-muted/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{card.merchant_name}</p>
                    <p className="text-xl font-bold">{formatCurrency(card.current_balance)}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>of {formatCurrency(card.initial_balance)}</span>
                    {card.expiry_date && (
                      <span>Expires: {format(new Date(card.expiry_date), 'MMM d, yyyy')}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </MobilePageLayout>
  );
}
