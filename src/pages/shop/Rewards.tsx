import { userData, vouchers } from "@/data/user";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, Gift, Clock, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Rewards = () => {
  const navigate = useNavigate();

  const handleRedeem = (voucherId: string) => {
    toast.success("Voucher redeemed successfully!");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-shop px-4 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="bg-white/20 rounded-full p-2"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-white text-xl font-bold">Rewards Wallet</h1>
        </div>
        
        {/* Points Card */}
        <div className="bg-white rounded-2xl p-6 card-elevated">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-muted-foreground text-sm">Your Points</p>
              <div className="flex items-center gap-2">
                <Star className="w-6 h-6 text-primary fill-primary" />
                <span className="text-4xl font-bold text-foreground">
                  {userData.loyaltyPoints.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="bg-primary/10 rounded-full p-4">
              <Gift className="w-8 h-8 text-primary" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Earn points with every purchase and redeem for rewards!
          </p>
        </div>
      </div>

      <div className="px-4 mt-6">
        <h2 className="text-lg font-bold text-foreground mb-4">
          Available Vouchers
        </h2>
        
        <div className="space-y-3">
          {vouchers.map((voucher) => (
            <div
              key={voucher.id}
              className={`bg-card rounded-xl p-4 card-elevated ${
                voucher.isRedeemed ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-foreground">{voucher.title}</h3>
                    {voucher.isRedeemed && (
                      <CheckCircle className="w-4 h-4 text-accent" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {voucher.description}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Expires: {voucher.expiresAt}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-primary font-semibold mb-2">
                    {voucher.pointsCost} pts
                  </p>
                  {!voucher.isRedeemed && (
                    <Button
                      size="sm"
                      onClick={() => handleRedeem(voucher.id)}
                      disabled={userData.loyaltyPoints < voucher.pointsCost}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Redeem
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* How to Earn */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-foreground mb-4">
            How to Earn Points
          </h2>
          <div className="bg-secondary rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-full p-2">
                <span className="text-lg">🛒</span>
              </div>
              <p className="text-sm text-foreground">Shop and earn points on every order</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-full p-2">
                <span className="text-lg">👥</span>
              </div>
              <p className="text-sm text-foreground">Refer friends for bonus points</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-full p-2">
                <span className="text-lg">⭐</span>
              </div>
              <p className="text-sm text-foreground">Leave reviews for extra rewards</p>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Rewards;
