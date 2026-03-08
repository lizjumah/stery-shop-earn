import { userData, earnings } from "@/data/user";
import { BottomNav } from "@/components/BottomNav";
import { ArrowLeft, TrendingUp, Wallet, Clock, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const EarningsDashboard = () => {
  const navigate = useNavigate();

  const paidEarnings = earnings.filter((e) => e.status === "paid");
  const pendingEarnings = earnings.filter((e) => e.status === "pending");

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
          <h1 className="text-white text-xl font-bold">Earnings Dashboard</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 card-elevated">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-accent" />
              <span className="text-sm text-muted-foreground">Total Earned</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              KSh {userData.totalEarnings.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 card-elevated">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Pending</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              KSh {userData.pendingEarnings.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-6">
        {/* Referral Bonus */}
        <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Referral Bonus</p>
              <p className="text-xl font-bold text-foreground">
                KSh {userData.referralBonus.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">People Referred</p>
              <p className="text-xl font-bold text-accent">{userData.referredUsers}</p>
            </div>
          </div>
        </div>

        {/* Recent Earnings */}
        <h2 className="text-lg font-bold text-foreground mb-4">
          Recent Earnings
        </h2>

        <div className="space-y-3">
          {earnings.map((earning) => (
            <div
              key={earning.id}
              className="bg-card rounded-xl p-4 flex items-center justify-between card-elevated"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-full p-2 ${
                    earning.status === "paid"
                      ? "bg-accent/10"
                      : "bg-primary/10"
                  }`}
                >
                  {earning.status === "paid" ? (
                    <CheckCircle className="w-5 h-5 text-accent" />
                  ) : (
                    <Clock className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-foreground">{earning.productName}</p>
                  <p className="text-xs text-muted-foreground">{earning.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-foreground">+KSh {earning.amount}</p>
                <p
                  className={`text-xs ${
                    earning.status === "paid" ? "text-accent" : "text-primary"
                  }`}
                >
                  {earning.status === "paid" ? "Paid" : "Pending"}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Withdrawal Info */}
        <div className="mt-8 bg-secondary rounded-xl p-4">
          <h3 className="font-bold text-foreground mb-2">💰 Withdrawal</h3>
          <p className="text-sm text-muted-foreground">
            Earnings are paid out every Friday via M-Pesa. Minimum withdrawal: KSh 500
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default EarningsDashboard;
