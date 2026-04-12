import { useProducts } from "@/hooks/useProducts";
import { useCommissions } from "@/hooks/useCommissions";
import { useReferrals } from "@/hooks/useReferrals";
import { Button } from "@/components/ui/button";
import { TrendingUp, Wallet, Users, Clock, Copy, ChevronRight, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";
import { useCustomer, getCustomerReferralCode } from "@/contexts/CustomerContext";

const EarnHome = () => {
  const { customer } = useCustomer();
  const referralCode = getCustomerReferralCode(customer);
  const referralLink = `${window.location.origin}/shop/${referralCode}`;
const { data: allProducts = [] } = useProducts();
  const { data: commissions = [], isLoading: commissionsLoading } = useCommissions();
  const { data: referrals = [] } = useReferrals();

  const topProducts = allProducts.filter((p) => p.isEarnable === true).slice(0, 6);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const isNewReseller = !commissionsLoading && commissions.length === 0;

  const FAQS = [
    { q: "Is joining free?", a: "Yes, completely free. Any Stery customer can start earning by sharing products right away." },
    { q: "When do I get paid?", a: "Commissions are confirmed once the customer's order is delivered. You can withdraw to M-Pesa any time you have KSh 500 or more available." },
    { q: "How much can I earn?", a: "It depends on how actively you share. Resellers who share regularly earn between KSh 2,000 and KSh 15,000 per month. Top resellers earn more." },
    { q: "How do I share a product?", a: "Tap 'Browse Products', pick any product, then tap the WhatsApp or Copy button. Your referral code is automatically included in the link." },
    { q: "What if a customer doesn't use my link?", a: "Only purchases made through your personal referral link or code are credited to you. Always share your unique link." },
  ];

  const paidTotal = commissions
    .filter((c) => c.status === "paid" || c.status === "confirmed")
    .reduce((s, c) => s + Number(c.amount), 0);
  const pendingTotal = commissions
    .filter((c) => c.status === "pending")
    .reduce((s, c) => s + Number(c.amount), 0);
  const completedReferrals = referrals.filter((r) => r.status === "completed").length;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied!");
  };


  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-earn px-4 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/80 text-sm">Welcome Reseller,</p>
            <h1 className="text-white text-xl font-bold">{customer?.name?.split(" ")[0] || "Reseller"} 💰</h1>
          </div>
          <Link to="/earn/dashboard" className="bg-white/20 rounded-full px-3 py-2 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-white" />
            <span className="text-white font-semibold text-sm">KSh {(paidTotal + pendingTotal).toLocaleString()}</span>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <Wallet className="w-4 h-4 text-white mx-auto mb-1" />
            {isNewReseller ? (
              <p className="text-white/60 text-[10px] mt-1">Start sharing</p>
            ) : (
              <p className="text-white font-bold text-sm">KSh {paidTotal.toLocaleString()}</p>
            )}
            <p className="text-white/70 text-[10px]">Paid Out</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <Clock className="w-4 h-4 text-white mx-auto mb-1" />
            {isNewReseller ? (
              <p className="text-white/60 text-[10px] mt-1">to earn</p>
            ) : (
              <p className="text-white font-bold text-sm">KSh {pendingTotal.toLocaleString()}</p>
            )}
            <p className="text-white/70 text-[10px]">Pending</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <Users className="w-4 h-4 text-white mx-auto mb-1" />
            <p className="text-white font-bold text-sm">{completedReferrals}</p>
            <p className="text-white/70 text-[10px]">Referrals</p>
          </div>
        </div>
        {/* Trust line */}
        <p className="text-white/60 text-xs text-center mt-3">
          💼 Join 200+ resellers earning daily with Stery
        </p>
      </div>

      <div className="px-4 mt-6">
        {/* My Shop — primary action card, always visible */}
        <div className="bg-accent/10 border border-accent/30 rounded-2xl p-4 mb-4">
          <p className="text-foreground font-bold text-base mb-3">
            {isNewReseller ? "🛍️ Set Up Your Shop" : "🏪 My Shop"}
          </p>
          <div className="space-y-2 mb-4">
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center">1</span>
              <div>
                <p className="text-sm font-semibold text-foreground">Choose products for your shop</p>
                <p className="text-xs text-muted-foreground">Pick from earnable products — these appear in your personal shop link.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center">2</span>
              <div>
                <p className="text-sm font-semibold text-foreground">Share your shop link and earn</p>
                <p className="text-xs text-muted-foreground">Every purchase through your link earns you a commission automatically.</p>
              </div>
            </div>
          </div>
          <Link to="/earn/my-products">
            <Button className="w-full h-11 bg-accent hover:bg-accent/90 font-semibold">
              {isNewReseller ? "Set Up My Shop" : "Manage My Products"}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>

        {/* My Shop Link — prominent, always visible */}
        <div className="bg-card border border-border rounded-2xl p-4 mb-4">
          <p className="text-foreground font-bold text-sm mb-0.5">🔗 My Shop Link</p>
          <p className="text-xs text-muted-foreground mb-3">
            This is your shop. Share this link to earn when people buy from your products.
          </p>
          {/* Link display */}
          <div className="bg-muted rounded-lg px-3 py-2 mb-3 flex items-center gap-2 overflow-hidden">
            <span className="text-xs text-foreground font-medium truncate flex-1">{referralLink}</span>
          </div>
          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={copyReferralLink} variant="outline" className="h-10 border-accent text-accent hover:bg-accent/10 text-sm font-semibold">
              <Copy className="w-4 h-4 mr-1.5" />Copy Link
            </Button>
            <Button
              onClick={() => {
                const name = customer?.name || "my";
                const text = `Hi! Welcome to ${name}'s shop on Stery. I've selected products I'm recommending. Shop here: ${referralLink}`;
                if (navigator.share) {
                  navigator.share({ text, url: referralLink }).catch(() => {});
                } else {
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                }
              }}
              className="h-10 bg-accent hover:bg-accent/90 text-sm font-semibold"
            >
              <Share2 className="w-4 h-4 mr-1.5" />Share Shop
            </Button>
          </div>
        </div>

        {/* Secondary nav */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <Link to="/earn/products">
            <Button variant="outline" className="w-full h-10 border-border text-foreground text-xs">Browse All Products</Button>
          </Link>
          <Link to="/earn/dashboard">
            <Button variant="outline" className="w-full h-10 border-border text-foreground text-xs">View Earnings</Button>
          </Link>
        </div>

        {/* FAQ */}
        <div className="mb-6">
          <h2 className="text-sm font-bold text-foreground mb-3">❓ Common Questions</h2>
          <div className="space-y-2">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="bg-card border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-medium text-foreground pr-4">{faq.q}</span>
                  <span className="text-muted-foreground text-lg shrink-0 leading-none">
                    {openFaq === idx ? "−" : "+"}
                  </span>
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-3">
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
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
            const productUrl = `${window.location.origin}/shop/product/${product.id}?ref=${referralCode}`;
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
    </div>
  );
};

export default EarnHome;
