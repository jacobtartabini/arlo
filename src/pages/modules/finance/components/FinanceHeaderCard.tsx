import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Upload, Wallet } from "lucide-react";

export function FinanceHeaderCard() {
  const navigate = useNavigate();

  return (
    <header className="relative z-10 p-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard")}
          className="glass rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Finance</h1>
            <p className="text-sm text-muted-foreground">Rocket Money-inspired clarity with Plaid-powered syncing.</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge className="glass border-emerald-500/30 text-emerald-400 bg-emerald-500/10 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Live sync
        </Badge>
        <Button className="glass-intense" size="sm">
          <Upload className="w-4 h-4 mr-2" /> Link with Plaid
        </Button>
      </div>
    </header>
  );
}
