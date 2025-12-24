import { useState } from "react";
import { motion } from "framer-motion";
import { Gift, Plus, Zap, Coffee, Film, Star, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useHabitSystem } from "@/hooks/useHabitSystem";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Reward } from "@/types/habits";

const PRESET_REWARDS = [
  { name: "Guilt-free break", xpCost: 100, icon: "coffee" },
  { name: "Favorite coffee", xpCost: 250, icon: "coffee" },
  { name: "Movie night", xpCost: 500, icon: "film" },
  { name: "Special treat", xpCost: 750, icon: "star" },
  { name: "Big reward", xpCost: 1000, icon: "trophy" },
];

interface RewardsStoreProps {
  rewards: Reward[];
  availableXp: number;
  onRefresh: () => void;
}

export function RewardsStore({ rewards, availableXp, onRefresh }: RewardsStoreProps) {
  const { createReward, redeemReward } = useHabitSystem();
  const [createOpen, setCreateOpen] = useState(false);
  const [newRewardName, setNewRewardName] = useState("");
  const [newRewardCost, setNewRewardCost] = useState(100);
  const [loading, setLoading] = useState(false);

  const handleCreateReward = async () => {
    if (!newRewardName.trim()) return;
    
    setLoading(true);
    const reward = await createReward({
      name: newRewardName,
      xpCost: newRewardCost,
    });
    setLoading(false);

    if (reward) {
      toast({ title: "Reward created!", description: `"${reward.name}" added to your store.` });
      setNewRewardName("");
      setNewRewardCost(100);
      setCreateOpen(false);
      onRefresh();
    }
  };

  const handleRedeem = async (reward: Reward) => {
    if (availableXp < reward.xpCost) {
      toast({ 
        title: "Not enough XP", 
        description: `You need ${reward.xpCost - availableXp} more XP.`,
        variant: "destructive"
      });
      return;
    }

    const success = await redeemReward(reward.id);
    if (success) {
      toast({ 
        title: "Reward redeemed! 🎉", 
        description: `Enjoy your "${reward.name}"!` 
      });
      onRefresh();
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "coffee": return <Coffee className="h-5 w-5" />;
      case "film": return <Film className="h-5 w-5" />;
      case "star": return <Star className="h-5 w-5" />;
      case "trophy": return <Trophy className="h-5 w-5" />;
      default: return <Gift className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Rewards Store</h2>
          <p className="text-sm text-muted-foreground">
            Spend your XP on real-life rewards you've earned
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Reward
        </Button>
      </div>

      {/* Available XP Banner */}
      <Card className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20">
            <Zap className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Available to spend</p>
            <p className="text-2xl font-bold text-amber-500">{availableXp} XP</p>
          </div>
        </div>
      </Card>

      {/* Rewards Grid */}
      {rewards.length === 0 ? (
        <Card className="p-8 text-center bg-muted/30 border-dashed">
          <Gift className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground mb-4">Create rewards to motivate yourself</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {PRESET_REWARDS.slice(0, 3).map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                onClick={async () => {
                  await createReward({ name: preset.name, xpCost: preset.xpCost, icon: preset.icon });
                  onRefresh();
                }}
              >
                {preset.name} ({preset.xpCost} XP)
              </Button>
            ))}
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rewards.map((reward, index) => {
            const canAfford = availableXp >= reward.xpCost;
            
            return (
              <motion.div
                key={reward.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={cn(
                  "p-4 transition-all",
                  canAfford ? "hover:border-amber-500/50" : "opacity-60"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      canAfford ? "bg-amber-500/10 text-amber-500" : "bg-muted text-muted-foreground"
                    )}>
                      {getIcon(reward.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{reward.name}</p>
                      <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3 text-amber-500" />
                        <span className="text-sm text-muted-foreground">{reward.xpCost} XP</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={canAfford ? "default" : "outline"}
                      disabled={!canAfford}
                      onClick={() => handleRedeem(reward)}
                    >
                      Redeem
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Reward Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Reward</DialogTitle>
            <DialogDescription>
              Add a personal reward to motivate yourself
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reward name</Label>
              <Input
                placeholder="e.g., Nice dinner out"
                value={newRewardName}
                onChange={(e) => setNewRewardName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>XP cost</Label>
              <div className="flex gap-2">
                {[100, 250, 500, 1000].map((cost) => (
                  <Button
                    key={cost}
                    type="button"
                    variant={newRewardCost === cost ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewRewardCost(cost)}
                  >
                    {cost}
                  </Button>
                ))}
              </div>
              <Input
                type="number"
                value={newRewardCost}
                onChange={(e) => setNewRewardCost(parseInt(e.target.value) || 100)}
                min={10}
                max={10000}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateReward} disabled={loading || !newRewardName.trim()}>
                {loading ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
