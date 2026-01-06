import { useState, useMemo } from "react";
import { format } from "date-fns";
import { 
  DollarSign, Plus, Plane, Home, Utensils, Car, 
  Ticket, ShoppingBag, MoreHorizontal, Trash2, Edit2,
  TrendingUp, TrendingDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TripExpense, ExpenseCategory } from "@/types/travel";
import { cn } from "@/lib/utils";

interface TripBudgetTabProps {
  tripId: string;
  expenses: TripExpense[];
  homeCurrency: string;
  destinationCurrency?: string;
  onCreateExpense: (
    category: ExpenseCategory,
    description: string,
    amount: number,
    options?: {
      currency?: string;
      isPlanned?: boolean;
      expenseDate?: Date;
    }
  ) => Promise<TripExpense | null>;
  onUpdateExpense: (id: string, updates: Partial<TripExpense>) => Promise<boolean>;
  onDeleteExpense: (id: string) => Promise<boolean>;
}

const CATEGORY_CONFIG: Record<ExpenseCategory, { icon: typeof Plane; color: string; label: string }> = {
  flights: { icon: Plane, color: 'text-cyan-500 bg-cyan-500/10', label: 'Flights' },
  lodging: { icon: Home, color: 'text-purple-500 bg-purple-500/10', label: 'Lodging' },
  food: { icon: Utensils, color: 'text-amber-500 bg-amber-500/10', label: 'Food' },
  transport: { icon: Car, color: 'text-blue-500 bg-blue-500/10', label: 'Transport' },
  activities: { icon: Ticket, color: 'text-green-500 bg-green-500/10', label: 'Activities' },
  shopping: { icon: ShoppingBag, color: 'text-pink-500 bg-pink-500/10', label: 'Shopping' },
  miscellaneous: { icon: MoreHorizontal, color: 'text-gray-500 bg-gray-500/10', label: 'Misc' },
};

export function TripBudgetTab({
  tripId,
  expenses,
  homeCurrency,
  destinationCurrency,
  onCreateExpense,
  onUpdateExpense,
  onDeleteExpense,
}: TripBudgetTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCategory, setNewCategory] = useState<ExpenseCategory>('activities');
  const [newDescription, setNewDescription] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newIsPlanned, setNewIsPlanned] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate totals by category
  const categoryTotals = useMemo(() => {
    const totals: Record<ExpenseCategory, { planned: number; actual: number }> = {
      flights: { planned: 0, actual: 0 },
      lodging: { planned: 0, actual: 0 },
      food: { planned: 0, actual: 0 },
      transport: { planned: 0, actual: 0 },
      activities: { planned: 0, actual: 0 },
      shopping: { planned: 0, actual: 0 },
      miscellaneous: { planned: 0, actual: 0 },
    };
    
    expenses.forEach(e => {
      if (e.isPlanned) {
        totals[e.category].planned += e.amount;
      } else {
        totals[e.category].actual += e.amount;
      }
    });
    
    return totals;
  }, [expenses]);

  const totalPlanned = Object.values(categoryTotals).reduce((sum, c) => sum + c.planned, 0);
  const totalActual = Object.values(categoryTotals).reduce((sum, c) => sum + c.actual, 0);
  const budgetRemaining = totalPlanned - totalActual;

  const handleAddExpense = async () => {
    const amount = parseFloat(newAmount);
    if (!newDescription.trim() || isNaN(amount) || amount <= 0) return;
    
    setIsSubmitting(true);
    try {
      await onCreateExpense(newCategory, newDescription.trim(), amount, {
        currency: homeCurrency,
        isPlanned: newIsPlanned,
      });
      setNewDescription("");
      setNewAmount("");
      setNewCategory('activities');
      setNewIsPlanned(true);
      setShowAddDialog(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Budget Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Budget</p>
              <p className="text-2xl font-bold">
                ${totalPlanned.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <DollarSign className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Spent</p>
              <p className="text-2xl font-bold">
                ${totalActual.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
        <Card className={cn("p-4", budgetRemaining < 0 && "border-red-500/50")}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              budgetRemaining >= 0 ? "bg-green-500/10" : "bg-red-500/10"
            )}>
              {budgetRemaining >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className={cn(
                "text-2xl font-bold",
                budgetRemaining < 0 && "text-red-500"
              )}>
                ${Math.abs(budgetRemaining).toLocaleString()}
                {budgetRemaining < 0 && ' over'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">By Category</CardTitle>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {(Object.entries(categoryTotals) as [ExpenseCategory, { planned: number; actual: number }][])
            .filter(([_, totals]) => totals.planned > 0 || totals.actual > 0)
            .map(([category, totals]) => {
              const config = CATEGORY_CONFIG[category];
              const Icon = config.icon;
              const percentage = totals.planned > 0 
                ? Math.min((totals.actual / totals.planned) * 100, 100)
                : 0;
              const isOver = totals.actual > totals.planned;
              
              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("p-1.5 rounded", config.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{config.label}</span>
                    </div>
                    <div className="text-right">
                      <span className={cn("font-semibold", isOver && "text-red-500")}>
                        ${totals.actual.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">
                        {' / '}${totals.planned.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={percentage} 
                    className={cn("h-2", isOver && "[&>div]:bg-red-500")}
                  />
                </div>
              );
            })}
          
          {Object.values(categoryTotals).every(t => t.planned === 0 && t.actual === 0) && (
            <p className="text-muted-foreground text-center py-4">
              No expenses yet. Add your first expense to start tracking.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Expenses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No expenses recorded yet
            </p>
          ) : (
            <div className="space-y-2">
              {expenses.slice(0, 10).map(expense => {
                const config = CATEGORY_CONFIG[expense.category];
                const Icon = config.icon;
                
                return (
                  <div 
                    key={expense.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50"
                  >
                    <div className={cn("p-2 rounded", config.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{expense.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {config.label}
                        {expense.expenseDate && ` · ${format(expense.expenseDate, 'MMM d')}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        ${expense.amount.toLocaleString()}
                      </p>
                      <Badge variant={expense.isPlanned ? 'secondary' : 'default'} className="text-xs">
                        {expense.isPlanned ? 'Planned' : 'Actual'}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onDeleteExpense(expense.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>Add a planned budget item or actual expense to track your spending.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newCategory} onValueChange={(v) => setNewCategory(v as ExpenseCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="e.g., Dinner at local restaurant"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount ({homeCurrency})</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select 
                  value={newIsPlanned ? 'planned' : 'actual'} 
                  onValueChange={(v) => setNewIsPlanned(v === 'planned')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Budget (Planned)</SelectItem>
                    <SelectItem value="actual">Spent (Actual)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddExpense} disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
