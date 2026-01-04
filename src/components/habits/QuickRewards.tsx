import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Zap, Check, Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Reward } from "@/types/habits";

interface QuickRewardsProps {
  rewards: Reward[];
  availableXp: number;
  onRedeem: (rewardId: string) => Promise<boolean>;
  onViewAll: () => void;
}

export function QuickRewards({ rewards, availableXp, onRedeem, onViewAll }: QuickRewardsProps) {
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [redeemed, setRedeemed] = useState<Set<string>>(new Set());

  const affordableRewards = rewards.filter(r => r.enabled && r.xpCost <= availableXp);
  const displayRewards = affordableRewards.slice(0, 3);

  const handleRedeem = async (reward: Reward) => {
    if (redeeming || redeemed.has(reward.id)) return;
    
    setRedeeming(reward.id);
    const success = await onRedeem(reward.id);
    setRedeeming(null);
    
    if (success) {
      setRedeemed(prev => new Set(prev).add(reward.id));
      setTimeout(() => {
        setRedeemed(prev => {
          const next = new Set(prev);
          next.delete(reward.id);
          return next;
        });
      }, 2000);
    }
  };

  if (rewards.length === 0) {
    return (
      <div className="p-4 rounded-2xl border bg-card">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Rewards</span>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Create rewards to spend your XP on
        </p>
        <Button variant="outline" size="sm" onClick={onViewAll} className="w-full">
          <Plus className="h-4 w-4 mr-1" />
          Create Reward
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl border bg-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Quick Rewards</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onViewAll}
          className="h-7 text-xs text-muted-foreground"
        >
          View all
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </div>

      {displayRewards.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Earn more XP to unlock rewards
        </p>
      ) : (
        <div className="space-y-2">
          {displayRewards.map(reward => (
            <motion.div
              key={reward.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded-xl border transition-all",
                redeemed.has(reward.id) && "bg-emerald-500/5 border-emerald-500/30"
              )}
            >
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm">
                🎁
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{reward.name}</p>
                <div className="flex items-center gap-1 text-xs text-amber-500">
                  <Zap className="h-3 w-3" />
                  {reward.xpCost}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-7 text-xs",
                  redeemed.has(reward.id) && "bg-emerald-500 text-white border-emerald-500"
                )}
                onClick={() => handleRedeem(reward)}
                disabled={redeeming === reward.id || redeemed.has(reward.id)}
              >
                <AnimatePresence mode="wait">
                  {redeemed.has(reward.id) ? (
                    <motion.span
                      key="done"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-1"
                    >
                      <Check className="h-3 w-3" />
                    </motion.span>
                  ) : (
                    <motion.span key="claim">
                      {redeeming === reward.id ? "..." : "Claim"}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
