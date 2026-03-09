import { useCustomer } from "@/contexts/CustomerContext";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Copy, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Referrals = () => {
  const { customer } = useCustomer();
  const navigate = useNavigate();
  const referralCode = customer?.phone?.replace(/\s+/g, "").slice(-6).toUpperCase() || "STERY";
  const referralLink = `https://stery.ke/ref/${referralCode}`;
    navigator.clipboard.writeText(referralCode);
    toast.success("Referral code copied!");
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied!");
  };

  const shareReferral = () => {
    const message = `Join me on Stery and start earning! Use my code ${referralCode} or sign up here: ${referralLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  // Mock referred users
  const referredUsers = [
    { name: "John M.", date: "Jan 15, 2024", bonus: 150 },
    { name: "Mary W.", date: "Jan 12, 2024", bonus: 150 },
    { name: "Peter K.", date: "Jan 10, 2024", bonus: 150 },
    { name: "Grace N.", date: "Jan 8, 2024", bonus: 150 },
    { name: "David O.", date: "Jan 5, 2024", bonus: 150 },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-earn px-4 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="bg-white/20 rounded-full p-2"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-white text-xl font-bold">Referrals</h1>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-2xl p-6 card-elevated">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-muted-foreground text-sm">Total Bonus Earned</p>
              <p className="text-3xl font-bold text-foreground">
                KSh 0
              </p>
            </div>
            <div className="bg-accent/10 rounded-full p-4">
              <Users className="w-8 h-8 text-accent" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" />
            <span className="text-foreground font-medium">
              0 people joined using your link
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 mt-6">
        {/* Referral Code */}
        <div className="bg-card rounded-xl p-4 mb-4 card-elevated">
          <p className="text-sm text-muted-foreground mb-2">Your Referral Code</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-foreground tracking-wider">
              {userData.referralCode}
            </span>
            <Button size="sm" variant="outline" onClick={copyReferralCode}>
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>
          </div>
        </div>

        {/* Referral Link */}
        <div className="bg-card rounded-xl p-4 mb-6 card-elevated">
          <p className="text-sm text-muted-foreground mb-2">Your Referral Link</p>
          <div className="flex items-center gap-2">
            <p className="text-sm text-foreground truncate flex-1">
              {userData.referralLink}
            </p>
            <Button size="sm" variant="outline" onClick={copyReferralLink}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Share Button */}
        <Button
          onClick={shareReferral}
          className="w-full h-14 mb-6 bg-accent hover:bg-accent/90"
        >
          <Share2 className="w-5 h-5 mr-2" />
          Share via WhatsApp
        </Button>

        {/* Referral Rewards Info */}
        <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6">
          <h3 className="font-bold text-foreground mb-2">🎁 Earn KSh 150 per referral!</h3>
          <p className="text-sm text-muted-foreground">
            When someone joins using your link and makes their first sale, you both earn KSh 150.
          </p>
        </div>

        {/* Referred Users */}
        <h2 className="text-lg font-bold text-foreground mb-4">
          People You've Referred
        </h2>

        <div className="space-y-3">
          {referredUsers.map((user, index) => (
            <div
              key={index}
              className="bg-card rounded-xl p-4 flex items-center justify-between card-elevated"
            >
              <div className="flex items-center gap-3">
                <div className="bg-accent/10 rounded-full w-10 h-10 flex items-center justify-center">
                  <span className="text-accent font-bold">
                    {user.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.date}</p>
                </div>
              </div>
              <span className="text-accent font-bold">+KSh {user.bonus}</span>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Referrals;
