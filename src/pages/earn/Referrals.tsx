import { useCustomer, getCustomerReferralCode } from "@/contexts/CustomerContext";
import { useReferrals } from "@/hooks/useReferrals";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Copy, Share2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Referrals = () => {
  const { customer } = useCustomer();
  const navigate = useNavigate();

  const referralCode = getCustomerReferralCode(customer);
  const referralLink = `${window.location.origin}/shop/${referralCode}`;

  const { data: referrals = [], isLoading } = useReferrals();

  const completedReferrals = referrals.filter((r) => r.status === "completed");
  const totalBonus = completedReferrals.reduce((s, r) => s + Number(r.bonus_amount), 0);

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success("Referral code copied!");
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied!");
  };

  const shareReferral = () => {
    const message = `Join me on Stery and start earning! Use my code ${referralCode} or sign up here: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-earn px-4 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="bg-white/20 rounded-full p-2">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-white text-xl font-bold">Referrals</h1>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-2xl p-6 card-elevated">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-muted-foreground text-sm">Total Bonus Earned</p>
              <p className="text-3xl font-bold text-foreground">KSh {totalBonus.toLocaleString()}</p>
            </div>
            <div className="bg-accent/10 rounded-full p-4">
              <Users className="w-8 h-8 text-accent" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" />
            <span className="text-foreground font-medium">
              {completedReferrals.length} {completedReferrals.length === 1 ? "person" : "people"} joined using your link
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 mt-6">
        {/* Referral Code */}
        <div className="bg-card rounded-xl p-4 mb-4 card-elevated">
          <p className="text-sm text-muted-foreground mb-2">Your Referral Code</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-foreground tracking-wider">{referralCode}</span>
            <Button size="sm" variant="outline" onClick={copyReferralCode}>
              <Copy className="w-4 h-4 mr-1" /> Copy
            </Button>
          </div>
        </div>

        {/* Referral Link */}
        <div className="bg-card rounded-xl p-4 mb-6 card-elevated">
          <p className="text-sm text-muted-foreground mb-2">Your Referral Link</p>
          <div className="flex items-center gap-2">
            <p className="text-sm text-foreground truncate flex-1">{referralLink}</p>
            <Button size="sm" variant="outline" onClick={copyReferralLink}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Share Button */}
        <Button onClick={shareReferral} className="w-full h-14 mb-6 bg-accent hover:bg-accent/90">
          <Share2 className="w-5 h-5 mr-2" /> Share via WhatsApp
        </Button>

        {/* Info */}
        <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6">
          <h3 className="font-bold text-foreground mb-2">🎁 Earn KSh 150 per referral!</h3>
          <p className="text-sm text-muted-foreground">
            When someone joins using your link and makes their first sale, you both earn KSh 150.
          </p>
        </div>

        {/* Referred Users */}
        <h2 className="text-lg font-bold text-foreground mb-4">People You've Referred</h2>

        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        )}

        {!isLoading && referrals.length === 0 && (
          <div className="bg-secondary rounded-xl p-6 text-center">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-muted-foreground font-medium text-sm">No referrals yet.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Share your link and earn KSh 150 for every person who joins.</p>
          </div>
        )}

        <div className="space-y-3">
          {referrals.map((referral) => (
            <div key={referral.id} className="bg-card rounded-xl p-4 flex items-center justify-between card-elevated">
              <div className="flex items-center gap-3">
                <div className="bg-accent/10 rounded-full w-10 h-10 flex items-center justify-center">
                  <span className="text-accent font-bold">
                    {(referral.referred_name || "?").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-foreground">{referral.referred_name || referral.referred_phone || "New member"}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(referral.created_at)}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-accent font-bold">+KSh {Number(referral.bonus_amount).toLocaleString()}</span>
                <p className={`text-[10px] mt-0.5 font-medium ${referral.status === "completed" ? "text-accent" : "text-muted-foreground"}`}>
                  {referral.status === "completed" ? "✓ Earned" : "⏳ Pending"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Referrals;
