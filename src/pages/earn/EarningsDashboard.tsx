import { useCustomer } from "@/contexts/CustomerContext";
import { useCommissions } from "@/hooks/useCommissions";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, Wallet, Clock, CheckCircle, ShoppingBag, Smartphone, BadgeDollarSign, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

const EarningsDashboard = () => {
  const { customer } = useCustomer();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<"week" | "month" | "all">("all");
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState(customer?.phone || "");

  const { data: commissions = [], isLoading } = useCommissions();

  // Filter by period
  const now = new Date();
  const filtered = commissions.filter((c) => {
    if (period === "all") return true;
    const date = new Date(c.created_at);
    if (period === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return date >= weekAgo;
    }
    if (period === "month") {
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      return date >= monthAgo;
    }
    return true;
  });

  const paidTotal = filtered.filter((c) => c.status === "paid" || c.status === "confirmed").reduce((s, c) => s + Number(c.amount), 0);
  const pendingTotal = filtered.filter((c) => c.status === "pending").reduce((s, c) => s + Number(c.amount), 0);
  const availableToWithdraw = paidTotal;
  const canWithdraw = availableToWithdraw >= 500;

  const handleWithdraw = () => {
    if (!canWithdraw) {
      toast.error("Minimum withdrawal is KSh 500.");
      return;
    }
    if (!mpesaPhone.trim()) {
      toast.error("Please enter your M-Pesa number.");
      return;
    }
    toast.success(`Withdrawal of KSh ${availableToWithdraw.toLocaleString()} requested to ${mpesaPhone}. You'll receive it within 24 hours.`);
    setShowWithdraw(false);
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
          <h1 className="text-white text-xl font-bold">Earnings Dashboard</h1>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl p-3 card-elevated text-center">
            <Wallet className="w-4 h-4 text-accent mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">KSh {(paidTotal + pendingTotal).toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Total Earned</p>
          </div>
          <div className="bg-white rounded-xl p-3 card-elevated text-center">
            <Clock className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">KSh {pendingTotal.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Pending</p>
          </div>
          <div className="bg-white rounded-xl p-3 card-elevated text-center">
            <BadgeDollarSign className="w-4 h-4 text-accent mx-auto mb-1" />
            <p className="text-lg font-bold text-accent">KSh {availableToWithdraw.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Available</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-white/80 text-xs">Paid Out</p>
            <p className="text-white font-bold">KSh {paidTotal.toLocaleString()}</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-white/80 text-xs">Orders Sold</p>
            <p className="text-white font-bold">{commissions.length}</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-6">
        {/* Withdraw Section */}
        {!showWithdraw ? (
          <Button
            onClick={() => setShowWithdraw(true)}
            disabled={!canWithdraw}
            className="w-full h-12 mb-4 bg-accent hover:bg-accent/90 disabled:opacity-50"
          >
            <Smartphone className="w-4 h-4 mr-2" />
            Withdraw to M-Pesa {canWithdraw ? `(KSh ${availableToWithdraw.toLocaleString()})` : "— Min KSh 500"}
          </Button>
        ) : (
          <div className="bg-card rounded-xl p-4 card-elevated border border-accent/30 mb-4 space-y-3">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-accent" /> Withdraw via M-Pesa
            </h3>
            <div>
              <label className="text-xs text-muted-foreground">M-Pesa Phone Number</label>
              <input
                type="tel"
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                placeholder="+254 7XX XXX XXX"
                className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="bg-accent/10 rounded-lg p-3">
              <p className="text-sm font-semibold text-foreground">Amount: <span className="text-accent">KSh {availableToWithdraw.toLocaleString()}</span></p>
              <p className="text-[10px] text-muted-foreground mt-0.5">You'll receive this within 24 hours via M-Pesa.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowWithdraw(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleWithdraw} className="flex-1 bg-accent hover:bg-accent/90">Confirm Withdrawal</Button>
            </div>
          </div>
        )}

        {!canWithdraw && !isLoading && commissions.length > 0 && (
          <div className="bg-secondary rounded-xl p-3 mb-4">
            <p className="text-xs text-muted-foreground text-center">
              💡 You need KSh {(500 - availableToWithdraw).toLocaleString()} more to reach the minimum withdrawal of KSh 500.
            </p>
          </div>
        )}

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

        {/* Sales Activity */}
        <h2 className="text-lg font-bold text-foreground mb-4">Recent Sales Activity</h2>

        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="bg-secondary rounded-xl p-6 text-center mb-4">
            <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-muted-foreground font-medium text-sm">No sales yet.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Share products with customers to start earning commissions.</p>
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((commission) => (
            <div key={commission.id} className="bg-card rounded-xl p-4 flex items-center justify-between card-elevated">
              <div className="flex items-center gap-3">
                <div className={`rounded-full p-2 ${commission.status === "paid" || commission.status === "confirmed" ? "bg-accent/10" : "bg-primary/10"}`}>
                  {commission.status === "paid" || commission.status === "confirmed"
                    ? <CheckCircle className="w-5 h-5 text-accent" />
                    : <Clock className="w-5 h-5 text-primary" />}
                </div>
                <div>
                  <p className="font-medium text-foreground">{commission.product_name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(commission.created_at)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-foreground">+KSh {Number(commission.amount).toLocaleString()}</p>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  commission.status === "paid" || commission.status === "confirmed"
                    ? "bg-accent/10 text-accent"
                    : "bg-primary/10 text-primary"
                }`}>
                  {commission.status === "paid" || commission.status === "confirmed" ? "✓ Confirmed" : "⏳ Pending"}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-secondary rounded-xl p-4">
          <h3 className="font-bold text-foreground mb-2">💰 How Commissions Work</h3>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li>• <strong>Pending</strong> — Commission created when order is placed</li>
            <li>• <strong>Confirmed</strong> — Commission confirmed when order is delivered</li>
            <li>• Withdraw via M-Pesa once you reach KSh 500</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EarningsDashboard;
