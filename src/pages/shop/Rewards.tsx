import { useApp } from "@/contexts/AppContext";
import { vouchers } from "@/data/user";
import { BottomNav } from "@/components/BottomNav";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, Gift, TrendingUp, Ticket, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const NEXT_REWARD_AT = 100;

const Rewards = () => {
  const navigate = useNavigate();
  const { loyaltyPoints, pointsHistory, redeemPoints } = useApp();

  const pointsToNext = Math.max(0, NEXT_REWARD_AT - (loyaltyPoints % NEXT_REWARD_AT));
  const progress = ((loyaltyPoints % NEXT_REWARD_AT) / NEXT_REWARD_AT) * 100;

  const availableVouchers = vouchers.filter((v) => !v.isRedeemed && loyaltyPoints >= v.pointsCost);
  const lockedVouchers = vouchers.filter((v) => !v.isRedeemed && loyaltyPoints < v.pointsCost);

  const handleRedeem = (pointsCost: number, title: string) => {
    const success = redeemPoints(pointsCost, `Redeemed: ${title}`);
    if (success) {
      toast.success(`🎁 ${title} redeemed! Apply it at checkout.`);
    } else {
      toast.error("Not enough points to redeem.");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-shop px-4 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="bg-white/20 rounded-full p-2">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-white text-xl font-bold">Rewards Wallet</h1>
        </div>

        {/* Points Balance Card */}
        <div className="bg-card rounded-2xl p-6 card-elevated">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Your Points</p>
              <div className="flex items-center gap-2 mt-1">
                <Star className="w-7 h-7 text-primary fill-primary" />
                <span className="text-4xl font-bold text-foreground">{loyaltyPoints}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">1 point = KSh 1 reward value</p>
            </div>
            <div className="bg-primary/10 rounded-full p-4">
              <Gift className="w-8 h-8 text-primary" />
            </div>
          </div>

          {/* Progress to Next Reward */}
          <div className="bg-muted rounded-xl p-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Next reward milestone</span>
              <span>{pointsToNext} pts to go</span>
            </div>
            <Progress value={progress} className="h-2.5 mb-1.5" />
            <p className="text-xs text-primary font-medium">
              {pointsToNext} more points to unlock your next reward ✨
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-6 space-y-6">
        {/* Available Vouchers */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Ticket className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Available Vouchers</h2>
          </div>
          {availableVouchers.length === 0 && lockedVouchers.length === 0 ? (
            <div className="bg-muted rounded-xl p-4 text-center">
              <p className="text-sm text-muted-foreground">Keep earning points to unlock vouchers!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableVouchers.map((v) => (
                <div key={v.id} className="bg-card rounded-xl p-4 card-elevated border border-primary/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 rounded-full p-2.5">
                        <Gift className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{v.title}</p>
                        <p className="text-xs text-muted-foreground">{v.description}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <p className="text-[10px] text-muted-foreground">Expires {v.expiresAt}</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90"
                      onClick={() => handleRedeem(v.pointsCost, v.title)}
                    >
                      Redeem
                    </Button>
                  </div>
                </div>
              ))}
              {lockedVouchers.map((v) => (
                <div key={v.id} className="bg-card rounded-xl p-4 card-elevated opacity-60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-secondary rounded-full p-2.5">
                        <Gift className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{v.title}</p>
                        <p className="text-xs text-muted-foreground">{v.pointsCost} pts required</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{v.pointsCost - loyaltyPoints} pts away</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Points History */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Points History</h2>
          </div>
          <div className="space-y-2">
            {pointsHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No points activity yet.</p>
            ) : (
              pointsHistory.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between bg-card rounded-xl p-3 card-elevated">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${entry.type === "redeemed" ? "bg-destructive/10" : entry.type === "bonus" ? "bg-accent/10" : "bg-primary/10"}`}>
                      <TrendingUp className={`w-4 h-4 ${entry.type === "redeemed" ? "text-destructive" : entry.type === "bonus" ? "text-accent" : "text-primary"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{entry.label}</p>
                      <p className="text-xs text-muted-foreground">{entry.date}</p>
                    </div>
                  </div>
                  <span className={`font-bold text-sm ${entry.points > 0 ? "text-primary" : "text-destructive"}`}>
                    {entry.points > 0 ? "+" : ""}{entry.points} pts
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* How Rewards Work */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-3">How Rewards Work</h2>
          <div className="bg-muted rounded-xl p-4 space-y-3">
            {[
              { emoji: "🛒", text: "KSh 100 spent = 1 loyalty point" },
              { emoji: "🎁", text: "1 point = KSh 1 reward value" },
              { emoji: "✅", text: "Minimum 50 points to redeem" },
              { emoji: "🎂", text: "Get 50 bonus points on your birthday" },
              { emoji: "🎉", text: "20 bonus points on your first order" },
              { emoji: "📦", text: "Basket bonuses at KSh 1K, 2K & 3K" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-lg">{item.emoji}</span>
                <p className="text-sm text-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Rewards;
