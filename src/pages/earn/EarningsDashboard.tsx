import { userData, earnings } from "@/data/user";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, Wallet, Clock, CheckCircle, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

const EarningsDashboard = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<"week" | "month" | "all">("all");

  const paidTotal = earnings.filter((e) => e.status === "paid").reduce((s, e) => s + e.amount, 0);
  const pendingTotal = earnings.filter((e) => e.status === "pending").reduce((s, e) => s + e.amount, 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-earn px-4 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="bg-white/20 rounded-full p-2">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-white text-xl font-bold">Earnings Dashboard</h1>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 card-elevated">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-accent" />
              <span className="text-xs text-muted-foreground">Total Earned</span>
            </div>
            <p className="text-2xl font-bold text-foreground">KSh {userData.totalEarnings.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-4 card-elevated">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-primary" />
              <span className="text-xs text-muted-foreground">Pending</span>
            </div>
            <p className="text-2xl font-bold text-foreground">KSh {userData.pendingEarnings.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-white/80 text-xs">Paid Out</p>
            <p className="text-white font-bold">KSh {userData.paidEarnings.toLocaleString()}</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-white/80 text-xs">Orders Sold</p>
            <p className="text-white font-bold">{userData.ordersSold}</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-6">
        {/* Period Tabs */}
        <div className="flex gap-2 mb-4">
          {(["week", "month", "all"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-sm rounded-full px-4 py-1.5 font-medium ${
                period === p ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {p === "week" ? "This Week" : p === "month" ? "This Month" : "All Time"}
            </button>
          ))}
        </div>

        {/* Simple Earnings Chart (bars) */}
        <div className="bg-card rounded-xl p-4 card-elevated mb-6">
          <h3 className="font-semibold text-foreground mb-3">Earnings Overview</h3>
          <div className="flex items-end gap-2 h-24">
            {[40, 100, 200, 120, 12, 60].map((amount, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-accent rounded-t-md"
                  style={{ height: `${(amount / 200) * 100}%` }}
                />
                <span className="text-[9px] text-muted-foreground mt-1">
                  {["Mar 2", "Mar 3", "Mar 4", "Mar 5", "Mar 6", "Mar 7"][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Earnings */}
        <h2 className="text-lg font-bold text-foreground mb-4">Recent Sales Activity</h2>
        <div className="space-y-3">
          {earnings.map((earning) => (
            <div key={earning.id} className="bg-card rounded-xl p-4 flex items-center justify-between card-elevated">
              <div className="flex items-center gap-3">
                <div className={`rounded-full p-2 ${earning.status === "paid" ? "bg-accent/10" : "bg-primary/10"}`}>
                  {earning.status === "paid" ? <CheckCircle className="w-5 h-5 text-accent" /> : <Clock className="w-5 h-5 text-primary" />}
                </div>
                <div>
                  <p className="font-medium text-foreground">{earning.productName}</p>
                  <p className="text-xs text-muted-foreground">{earning.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-foreground">+KSh {earning.amount}</p>
                <p className={`text-xs ${earning.status === "paid" ? "text-accent" : "text-primary"}`}>
                  {earning.status === "paid" ? "Paid" : "Pending"}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Withdraw */}
        <Button
          onClick={() => toast.success("Withdrawal request submitted!")}
          className="w-full h-12 mt-6 bg-accent hover:bg-accent/90"
        >
          Request Withdrawal
        </Button>

        <div className="mt-4 bg-secondary rounded-xl p-4">
          <h3 className="font-bold text-foreground mb-2">💰 Withdrawal Info</h3>
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
