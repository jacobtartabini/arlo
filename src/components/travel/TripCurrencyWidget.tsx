import { useState, useEffect } from "react";
import { DollarSign, RefreshCw, AlertCircle, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getArloToken } from "@/lib/arloAuth";

interface TripCurrencyWidgetProps {
  fromCurrency: string;
  toCurrency: string;
}

export function TripCurrencyWidget({ fromCurrency, toCurrency }: TripCurrencyWidgetProps) {
  const [rate, setRate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [amount, setAmount] = useState("100");
  const [tipPercent, setTipPercent] = useState(15);

  const fetchRate = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = await getArloToken();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/travel-api`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'currency',
            from: fromCurrency,
            to: toCurrency,
          }),
        }
      );

      const data = await response.json();
      
      if (data.configured === false) {
        setNotConfigured(true);
      } else if (data.error) {
        setError(data.error);
      } else if (data.rate) {
        setRate(data.rate);
      }
    } catch (e) {
      setError("Failed to load exchange rate");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRate();
  }, [fromCurrency, toCurrency]);

  const amountNum = parseFloat(amount) || 0;
  const converted = rate ? amountNum * rate : 0;
  const tipAmount = converted * (tipPercent / 100);
  const totalWithTip = converted + tipAmount;

  if (notConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Currency Converter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>
              Add EXCHANGERATE_API_KEY in Settings → Travel to enable currency conversion
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Currency Converter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Currency Converter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchRate} className="mt-2">
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          {fromCurrency} → {toCurrency}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={fetchRate}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground">Exchange Rate</p>
          <p className="text-2xl font-bold">
            1 {fromCurrency} = {rate?.toFixed(4)} {toCurrency}
          </p>
        </div>

        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Quick Convert</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-24"
            />
            <span className="text-muted-foreground">{fromCurrency} =</span>
            <span className="font-semibold">
              {converted.toFixed(2)} {toCurrency}
            </span>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Tip Calculator</p>
            <div className="flex gap-2">
              {[10, 15, 18, 20].map(pct => (
                <Button
                  key={pct}
                  variant={tipPercent === pct ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTipPercent(pct)}
                >
                  {pct}%
                </Button>
              ))}
            </div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tip ({tipPercent}%):</span>
                <span>{tipAmount.toFixed(2)} {toCurrency}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total:</span>
                <span>{totalWithTip.toFixed(2)} {toCurrency}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
