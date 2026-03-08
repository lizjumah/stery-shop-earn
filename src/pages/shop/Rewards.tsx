import { useApp } from "@/contexts/AppContext";
import { BottomNav } from "@/components/BottomNav";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Star, Gift, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

const NEXT_REWARD_AT = 100;

const Rewards = () => {
  const navigate = useNavigate();
  const { loyaltyPoints, pointsHistory } = useApp();

  const pointsToNext = Math.max(0, NEXT_REWARD_AT - (loyaltyPoints % NEXT_REWARD_AT));
  const progress = ((loyaltyPoints % NEXT_REWARD_AT) / NEXT_REWARD_AT) * 100;

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

        {/* Points Card */}
        <div className="bg-white rounded-2xl p-6 card-elevated">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-muted-foreground text-sm">Your Stery Points</p>
              <div className="flex items-center gap-2">
                <Star className="w-6 h-6 text-primary fill-primary" />
                <span className="text-4xl font-bold text-foreground">{loyaltyPoints}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">1 point = KSh 1 reward value</p>
            </div>
            <div className="bg-primary/10 rounded-full p-4">
              <Gift className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{loyaltyPoints >= 50 ? "✅ You can redeem points!" : `${50 - loyaltyPoints} pts to min redemption`}</span>
              <span>{pointsToNext} pts to next milestone</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          <p className="text-xs text-primary font-medium">
            You are {pointsToNext} points away from your next reward milestone.
          </p>
        </div>
      </div>

      <div className="px-4 mt-6">
        {/* Available Rewards */}
        <h2 className="text-lg font-bold text-foreground mb-4">Available Rewards</h2>
        <div className="space-y-3 mb-6">
          {[
            { pts: 50, reward: "KSh 50 discount" },
            { pts: 100, reward: "KSh 100 discount" },
            { pts: 200, reward: "KSh 200 discount" },
          ].map((r) => (
            <div
              key={r.pts}
              className={`bg-card rounded-xl p-4 card-elevated flex items-center justify-between ${loyaltyPoints >= r.pts ? "border border-primary/30" : "opacity-60"}`}
            >
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 rounded-full p-2">
                  <Gift className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{r.reward}</p>
                  <p className="text-xs text-muted-foreground">{r.pts} points required</p>
                </div>
              </div>
              {loyaltyPoints >= r.pts ? (
                <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1">Available</span>
              ) : (
                <span className="text-xs text-muted-foreground">{r.pts - loyaltyPoints} pts away</span>
              )}
            </div>
          ))}
        </div>

        {/* Points History */}
        <h2 className="text-lg font-bold text-foreground mb-4">Points History</h2>
        <div className="space-y-2 mb-6">
          {pointsHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No points activity yet.</p>
          ) : (
            pointsHistory.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between bg-card rounded-lg p-3 card-elevated">
                <div className="flex items-center gap-3">
                  <div className={`rounded-full p-1.5 ${entry.type === "redeemed" ? "bg-destructive/10" : entry.type === "bonus" ? "bg-accent/10" : "bg-primary/10"}`}>
                    <TrendingUp className={`w-4 h-4 ${entry.type === "redeemed" ? "text-destructive" : entry.type === "bonus" ? "text-accent" : "text-primary"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{entry.label}</p>
                    <p className="text-xs text-muted-foreground">{entry.date}</p>
                  </div>
                </div>
                <span className={`font-bold ${entry.points > 0 ? "text-primary" : "text-destructive"}`}>
                  {entry.points > 0 ? "+" : ""}{entry.points}
                </span>
              </div>
            ))
          )}
        </div>

        {/* How It Works */}
        <h2 className="text-lg font-bold text-foreground mb-4">How Rewards Work</h2>
        <div className="bg-secondary rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-full p-2"><span className="text-lg">🛒</span></div>
            <p className="text-sm text-foreground">KSh 100 spent = 1 loyalty point</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-full p-2"><span className="text-lg">🎁</span></div>
            <p className="text-sm text-foreground">1 point = KSh 1 reward value</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-full p-2"><span className="text-lg">✅</span></div>
            <p className="text-sm text-foreground">Minimum 50 points to redeem</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-full p-2"><span className="text-lg">🎂</span></div>
            <p className="text-sm text-foreground">Get 50 bonus points on your birthday</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-full p-2"><span className="text-lg">🎉</span></div>
            <p className="text-sm text-foreground">20 bonus points on your first order</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-full p-2"><span className="text-lg">📦</span></div>
            <p className="text-sm text-foreground">Basket bonuses: KSh 1K→10pts, KSh 2K→30pts, KSh 3K→Free delivery</p>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Rewards;
