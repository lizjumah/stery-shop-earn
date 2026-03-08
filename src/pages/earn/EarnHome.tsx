import { userData } from "@/data/user";
import { products } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { TrendingUp, Wallet, Users, Clock, Copy, ChevronRight, Share2, MessageCircle, Smartphone, Facebook, Link as LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const EarnHome = () => {
  const topProducts = products.filter((p) => (p.commission || 0) >= 40).slice(0, 4);

  const copyReferralLink = () => {
    navigator.clipboard.writeText(userData.referralLink);
    toast.success("Referral link copied!");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-earn px-4 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/80 text-sm">Welcome Reseller,</p>
            <h1 className="text-white text-xl font-bold">{userData.name.split(" ")[0]} 💰</h1>
          </div>
          <Link to="/earn/dashboard" className="bg-white/20 rounded-full px-3 py-2 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-white" />
            <span className="text-white font-semibold text-sm">KSh {userData.totalEarnings.toLocaleString()}</span>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <Wallet className="w-4 h-4 text-white mx-auto mb-1" />
            <p className="text-white font-bold text-sm">KSh {userData.paidEarnings.toLocaleString()}</p>
            <p className="text-white/70 text-[10px]">Paid Out</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <Clock className="w-4 h-4 text-white mx-auto mb-1" />
            <p className="text-white font-bold text-sm">KSh {userData.pendingEarnings}</p>
            <p className="text-white/70 text-[10px]">Pending</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <Users className="w-4 h-4 text-white mx-auto mb-1" />
            <p className="text-white font-bold text-sm">{userData.referredUsers}</p>
            <p className="text-white/70 text-[10px]">Referrals</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link to="/earn/products">
            <Button className="w-full h-12 bg-accent hover:bg-accent/90">Browse Products</Button>
          </Link>
          <Link to="/earn/dashboard">
            <Button variant="outline" className="w-full h-12 border-accent text-accent hover:bg-accent/10">View Earnings</Button>
          </Link>
        </div>

        {/* Referral Card */}
        <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground font-semibold text-sm">My Referral Link</p>
              <p className="text-xs text-muted-foreground truncate max-w-[180px]">{userData.referralLink}</p>
            </div>
            <Button size="sm" onClick={copyReferralLink} className="bg-accent hover:bg-accent/90">
              <Copy className="w-4 h-4 mr-1" />Copy
            </Button>
          </div>
        </div>

        {/* Top Products to Resell */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground">🔥 Top Products to Resell</h2>
          <Link to="/earn/products" className="text-sm text-accent font-medium flex items-center gap-0.5">
            See All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {topProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default EarnHome;
