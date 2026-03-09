import { products } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { TrendingUp, Wallet, Users, Clock, Copy, ChevronRight, Share2, MessageCircle, Smartphone, Facebook, Link as LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";
import { useCustomer } from "@/contexts/CustomerContext";

const EarnHome = () => {
  const { customer } = useCustomer();
  const referralCode = customer?.phone?.replace(/\s+/g, "").slice(-6).toUpperCase() || "STERY";
  const referralLink = `https://stery.ke/ref/${referralCode}`;
  const SHARE_MESSAGE = `Join Stery and start earning rewards when you shop or share deals. Use my link to sign up: ${referralLink}`;
  const topProducts = products.filter((p) => (p.commission || 0) >= 40).slice(0, 6);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied!");
  };

  const shareVia = (channel: string) => {
    const encoded = encodeURIComponent(SHARE_MESSAGE);
    setShowShareMenu(false);
    switch (channel) {
      case "whatsapp":
        window.open(`https://wa.me/?text=${encoded}`, "_blank");
        break;
      case "sms":
        window.open(`sms:?body=${encoded}`, "_blank");
        break;
      case "facebook":
        window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encoded}&u=${encodeURIComponent(referralLink)}`, "_blank");
        break;
      case "copy":
        navigator.clipboard.writeText(SHARE_MESSAGE);
        toast.success("Message copied to clipboard!");
        break;
    }
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

        {/* Share & Earn Button + Menu */}
        <div className="mb-6 relative">
          <Button
            className="w-full h-14 bg-accent hover:bg-accent/90 text-lg font-bold rounded-xl"
            onClick={() => setShowShareMenu((v) => !v)}
          >
            <Share2 className="w-5 h-5 mr-2" />
            Share & Earn
          </Button>
          {showShareMenu && (
            <div className="mt-2 bg-card rounded-xl border border-border card-elevated p-3 space-y-2 animate-fade-in">
              <p className="text-xs text-muted-foreground mb-2">Invite friends and earn rewards 🎉</p>
              {[
                { id: "whatsapp", label: "WhatsApp", icon: <MessageCircle className="w-4 h-4" />, color: "bg-green-500/10 text-green-600" },
                { id: "sms", label: "SMS", icon: <Smartphone className="w-4 h-4" />, color: "bg-blue-500/10 text-blue-600" },
                { id: "facebook", label: "Facebook", icon: <Facebook className="w-4 h-4" />, color: "bg-blue-600/10 text-blue-700" },
                { id: "copy", label: "Copy Link", icon: <LinkIcon className="w-4 h-4" />, color: "bg-muted text-foreground" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => shareVia(opt.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className={`rounded-full p-2 ${opt.color}`}>{opt.icon}</div>
                  <span className="font-medium text-sm text-foreground">{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Top Products to Resell */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground">🔥 Top Products to Resell</h2>
          <Link to="/earn/products" className="text-sm text-accent font-medium flex items-center gap-0.5">
            See All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="space-y-3">
          {topProducts.map((product) => {
            const isBestSeller = (product.commission || 0) >= 100;
            const isHighDemand = (product.commission || 0) >= 60 && !isBestSeller;
            const productUrl = `${window.location.origin}/shop/product/${product.id}?ref=${userData.referralCode}`;
            const shareMsg = `Great deal at Stery!\n${product.name} now KSh ${product.price}.\nOrder through my link and enjoy this offer.\n${productUrl}`;

            const shareProduct = (channel: string) => {
              const encoded = encodeURIComponent(shareMsg);
              switch (channel) {
                case "whatsapp": window.open(`https://wa.me/?text=${encoded}`, "_blank"); break;
                case "sms": window.open(`sms:?body=${encoded}`, "_blank"); break;
                case "facebook": window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encoded}&u=${encodeURIComponent(productUrl)}`, "_blank"); break;
                case "copy":
                  navigator.clipboard.writeText(shareMsg);
                  toast.success("Product link copied!");
                  break;
              }
            };

            return (
              <div key={product.id} className="bg-card rounded-xl overflow-hidden card-elevated border border-border">
                <div className="flex gap-3 p-3">
                  <Link to={`/earn/product/${product.id}`} className="shrink-0">
                    <div className="relative">
                      <img src={product.image} alt={product.name} className="w-20 h-20 rounded-xl object-cover" />
                      {isBestSeller && (
                        <span className="absolute -top-1.5 -left-1.5 bg-accent text-accent-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">⭐ Best Seller</span>
                      )}
                      {isHighDemand && (
                        <span className="absolute -top-1.5 -left-1.5 bg-destructive text-destructive-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">🔥 High Demand</span>
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-foreground truncate">{product.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Retail: KSh {product.price}</p>
                    <div className="mt-1.5 bg-accent/10 rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1">
                      <span className="text-accent font-bold text-sm">Earn KSh {product.commission}</span>
                      <span className="text-[10px] text-accent/70">per sale</span>
                    </div>
                    <div className="mt-1.5">
                      <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Potential Earnings:</p>
                      <div className="flex gap-2">
                        <span className="text-[10px] bg-muted rounded px-1.5 py-0.5 text-foreground font-medium">10 sales → <strong className="text-accent">KSh {(product.commission || 0) * 10}</strong></span>
                        <span className="text-[10px] bg-muted rounded px-1.5 py-0.5 text-foreground font-medium">50 sales → <strong className="text-accent">KSh {((product.commission || 0) * 50).toLocaleString()}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Social proof */}
                {(isBestSeller || isHighDemand) && (
                  <div className="px-3 py-1.5 bg-accent/5">
                    <p className="text-[10px] text-muted-foreground">
                      {isBestSeller ? "⭐ " : "🔥 "}{Math.floor(Math.random() * 30 + 10)} resellers shared this product today
                    </p>
                  </div>
                )}
                {/* Share to Sell row */}
                <div className="border-t border-border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground mr-auto font-medium">Share to Sell:</span>
                    {[
                      { id: "whatsapp", label: "WhatsApp", color: "bg-green-500/10 text-green-600 hover:bg-green-500/20" },
                      { id: "sms", label: "SMS", color: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20" },
                      { id: "facebook", label: "FB", color: "bg-blue-600/10 text-blue-700 hover:bg-blue-600/20" },
                      { id: "copy", label: "Copy", color: "bg-muted text-foreground hover:bg-muted/80" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => shareProduct(opt.id)}
                        className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-full transition-colors ${opt.color}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Share with friends on WhatsApp and earn for every purchase.</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default EarnHome;
