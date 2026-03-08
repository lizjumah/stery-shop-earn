import { useApp } from "@/contexts/AppContext";
import { userData } from "@/data/user";
import { products } from "@/data/products";
import { getTodayDeals } from "@/data/dailyDeals";
import { BottomNav } from "@/components/BottomNav";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Star, ShoppingBag, DollarSign, Gift, Flame, ChevronRight, ShoppingCart } from "lucide-react";
import { CommunityActivity } from "@/components/shop/CommunityActivity";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const NEXT_REWARD_AT = 100;

const quickActions = [
  { icon: ShoppingBag, label: "Shop Groceries", emoji: "🛒", path: "/shop/browse", color: "bg-primary/10 text-primary" },
  { icon: DollarSign, label: "Stery Earn", emoji: "💰", path: "/earn", color: "bg-accent/10 text-accent" },
  { icon: Gift, label: "Rewards Wallet", emoji: "🎁", path: "/shop/rewards", color: "bg-purple-500/10 text-purple-600" },
  { icon: Flame, label: "Today's Deals", emoji: "🔥", path: "/shop/offers", color: "bg-destructive/10 text-destructive" },
];

const HomeDashboard = () => {
  const { loyaltyPoints, addToCart } = useApp();
  const navigate = useNavigate();
  const firstName = userData.name.split(" ")[0];

  const pointsToNext = Math.max(0, NEXT_REWARD_AT - (loyaltyPoints % NEXT_REWARD_AT));
  const progress = ((loyaltyPoints % NEXT_REWARD_AT) / NEXT_REWARD_AT) * 100;

  // Get today's featured deal
  const todayDeals = getTodayDeals();
  const featuredDeal = todayDeals.find((d) => d.featured) || todayDeals[0];
  const dealProduct = featuredDeal ? products.find((p) => p.id === featuredDeal.productId) : null;

  const handleAddDeal = () => {
    if (!dealProduct) return;
    addToCart(dealProduct.id);
    toast.success(`${dealProduct.name} added to cart!`, {
      action: { label: "View Cart", onClick: () => navigate("/shop/cart") },
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-shop px-4 pt-8 pb-6 rounded-b-3xl">
        <p className="text-white/80 text-sm">{getGreeting()},</p>
        <h1 className="text-white text-2xl font-bold mb-5">{firstName} 👋</h1>

        {/* Loyalty Summary Card */}
        <div className="bg-card rounded-2xl p-5 card-elevated">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Points Balance</p>
              <div className="flex items-center gap-2 mt-1">
                <Star className="w-6 h-6 text-primary fill-primary" />
                <span className="text-3xl font-bold text-foreground">{loyaltyPoints}</span>
                <span className="text-sm text-muted-foreground">pts</span>
              </div>
            </div>
            <Link to="/shop/rewards">
              <div className="bg-primary/10 rounded-full p-3">
                <Gift className="w-6 h-6 text-primary" />
              </div>
            </Link>
          </div>

          <div className="mb-1.5">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progress to next reward</span>
              <span>{pointsToNext} pts to go</span>
            </div>
            <Progress value={progress} className="h-2.5" />
          </div>
          <p className="text-xs text-primary font-medium mt-1">
            {pointsToNext} more points to unlock your next voucher ✨
          </p>
        </div>
      </div>

      <div className="px-4 mt-5 space-y-5">
        {/* Today's Deal Card */}
        {dealProduct && (
          <div className="bg-card rounded-2xl overflow-hidden card-elevated border border-destructive/20">
            <div className="bg-destructive/5 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-destructive" />
                <h2 className="font-bold text-foreground">Today's Deal</h2>
              </div>
              <Link to="/shop/offers" className="text-xs text-primary font-medium flex items-center gap-0.5">
                See all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="p-4 flex items-center gap-4">
              <img
                src={dealProduct.image}
                alt={dealProduct.name}
                className="w-20 h-20 rounded-xl object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground truncate">{dealProduct.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-bold text-primary">KSh {dealProduct.price}</span>
                  {dealProduct.originalPrice && (
                    <span className="text-sm text-muted-foreground line-through">KSh {dealProduct.originalPrice}</span>
                  )}
                </div>
                {dealProduct.originalPrice && (
                  <span className="inline-block mt-1 text-[10px] font-semibold bg-destructive/10 text-destructive rounded-full px-2 py-0.5">
                    {Math.round(((dealProduct.originalPrice - dealProduct.price) / dealProduct.originalPrice) * 100)}% OFF
                  </span>
                )}
              </div>
              <Button
                size="icon"
                className="bg-primary hover:bg-primary/90 rounded-full h-11 w-11 shrink-0"
                onClick={handleAddDeal}
              >
                <ShoppingCart className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Quick Actions Grid */}
        <div>
          <h2 className="font-bold text-foreground mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.path}
                to={action.path}
                className="bg-card rounded-xl p-4 flex items-center gap-3 card-elevated border border-border active:scale-[0.98] transition-transform"
              >
                <div className={`rounded-xl p-2.5 ${action.color}`}>
                  <span className="text-xl">{action.emoji}</span>
                </div>
                <span className="font-semibold text-sm text-foreground">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Community Activity */}
        <CommunityActivity />

        {/* Recent Activity Teaser */}
        <div className="bg-card rounded-xl p-4 card-elevated border border-border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-foreground text-sm">Your Rewards Activity</h3>
            <Link to="/shop/rewards" className="text-xs text-primary font-medium">View all</Link>
          </div>
          <div className="space-y-2">
            {loyaltyPoints >= 50 && (
              <div className="flex items-center gap-2 bg-primary/5 rounded-lg p-2.5">
                <span className="text-sm">🎁</span>
                <p className="text-xs text-foreground font-medium">You have a <strong className="text-primary">KSh 50 voucher</strong> ready to redeem!</p>
              </div>
            )}
            <div className="flex items-center gap-2 bg-muted rounded-lg p-2.5">
              <span className="text-sm">🛒</span>
              <p className="text-xs text-muted-foreground">Shop to earn more points and unlock bigger rewards.</p>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default HomeDashboard;
