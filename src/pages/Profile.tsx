import { useCustomer, getCustomerRole } from "@/contexts/CustomerContext";
import type { CustomerRole } from "@/contexts/CustomerContext";
import { useApp } from "@/contexts/AppContext";
import { useCommissions } from "@/hooks/useCommissions";
import { Button } from "@/components/ui/button";
import {
  User, Phone, Mail, MapPin, ChevronRight, ChevronDown, ChevronUp,
  LogOut, HelpCircle, Settings, Star, TrendingUp, ClipboardList,
  Cake, LayoutDashboard, PhoneCall, MessageCircle, Lock,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

const STERY_PHONE = "+254712426918";
const STERY_WHATSAPP = "254712426918";

const Profile = () => {
  const navigate = useNavigate();
  const { setMode } = useApp();
  const { customer, updateCustomer, logout: customerLogout, loginByPhone, completeLogin } = useCustomer();
  const { data: commissions = [] } = useCommissions();
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  // PIN step — populated when a staff/owner phone lookup succeeds
  const [pendingStaff, setPendingStaff] = useState<{ name: string; staff_pin: string | null | undefined; completeWith: Parameters<typeof completeLogin>[0] } | null>(null);
  const [pinInput, setPinInput] = useState("");

  const role = getCustomerRole(customer);
  const loyaltyPoints = customer?.loyalty_points || 0;

  // Earn wallet — only confirmed commissions count as available balance
  const earnConfirmed = commissions
    .filter((c) => c.status === "confirmed")
    .reduce((sum, c) => sum + c.amount, 0);
  const earnPending = commissions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + c.amount, 0);

  const handleLogout = () => {
    customerLogout();
    setMode(null);
    navigate("/");
  };

  const handleRetrieveAccount = async () => {
    if (!phoneInput.trim()) {
      toast.error("Please enter your phone number");
      return;
    }
    const found = await loginByPhone(phoneInput);
    if (!found) {
      toast.error("No account found. Place your first order to create an account.");
      return;
    }
    const foundRole: CustomerRole = getCustomerRole(found);
    if (foundRole === "staff" || foundRole === "owner" || foundRole === "product_manager") {
      // Session NOT yet set — pause and request PIN
      setPendingStaff({ name: found.name, staff_pin: found.staff_pin, completeWith: found });
      setPinInput("");
      return;
    }
    // Regular customer — session already completed by loginByPhone
    toast.success(`Welcome back, ${found.name}!`);
    setShowPhoneInput(false);
  };

  const handlePinSubmit = async () => {
    if (!pendingStaff) return;
    if (!pinInput.trim()) {
      toast.error("Please enter your PIN");
      return;
    }
    if (pendingStaff.staff_pin && pinInput === pendingStaff.staff_pin) {
      await completeLogin(pendingStaff.completeWith);
      toast.success(`Welcome back, ${pendingStaff.name}!`);
      setPendingStaff(null);
      setPinInput("");
      setShowPhoneInput(false);
    } else {
      toast.error("Incorrect PIN. Please try again.");
      setPinInput("");
    }
  };

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!customer) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="gradient-shop px-4 pt-6 pb-8 rounded-b-3xl">
          <h1 className="text-white text-xl font-bold mb-6">Account</h1>
          <div className="bg-white rounded-2xl p-6 card-elevated text-center">
            <div className="rounded-full w-16 h-16 flex items-center justify-center bg-primary/10 mx-auto mb-4">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">Welcome to Stery</h2>
            <p className="text-sm text-muted-foreground mb-1">
              New here? Start shopping and we'll create your account at checkout. Already have an account? Sign in below.
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Shop fresh groceries, household items, fashion and more from Stery Supermarket.
            </p>
            {!showPhoneInput && !pendingStaff ? (
              <div className="space-y-2">
                <Button onClick={() => navigate("/shop")} className="w-full bg-primary hover:bg-primary/90">
                  Start Shopping
                </Button>
                <Button onClick={() => setShowPhoneInput(true)} variant="outline" className="w-full">
                  Sign In
                </Button>
              </div>
            ) : pendingStaff ? (
              /* PIN step — only reached by staff/owner */
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Lock className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">Enter your 4-digit PIN</p>
                </div>
                <p className="text-xs text-muted-foreground">Hi {pendingStaff.name}, please enter your PIN to continue.</p>
                <input
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  autoFocus
                  className="w-full bg-secondary rounded-lg py-2.5 px-3 text-foreground text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                />
                <div className="flex gap-2">
                  <Button onClick={() => { setPendingStaff(null); setPinInput(""); setShowPhoneInput(false); }} variant="outline" className="flex-1">Cancel</Button>
                  <Button onClick={handlePinSubmit} className="flex-1 bg-primary hover:bg-primary/90" disabled={pinInput.length !== 4}>Confirm</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Enter your phone number to retrieve your account:</p>
                <input
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  type="tel"
                  placeholder="e.g. 0712345678"
                  className="w-full bg-secondary rounded-lg py-2.5 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                />
                <div className="flex gap-2">
                  <Button onClick={() => setShowPhoneInput(false)} variant="outline" className="flex-1">Cancel</Button>
                  <Button onClick={handleRetrieveAccount} className="flex-1 bg-primary hover:bg-primary/90">Find Account</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Staff — admin-only view ────────────────────────────────────────────────
  if (role === "staff") {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="gradient-shop px-4 pt-6 pb-8 rounded-b-3xl">
          <h1 className="text-white text-xl font-bold mb-4">Account</h1>
          <div className="bg-white rounded-2xl p-4 card-elevated">
            <div className="flex items-center gap-3">
              <div className="rounded-full w-12 h-12 bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground">{customer.name}</p>
                <p className="text-xs text-muted-foreground">{customer.phone}</p>
                <span className="text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5 mt-1 inline-block">
                  Staff
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="px-4 mt-6 space-y-3">
          <Link
            to="/admin/orders"
            className="flex items-center gap-4 p-4 bg-card rounded-xl card-elevated border border-border"
          >
            <LayoutDashboard className="w-5 h-5 text-primary" />
            <span className="flex-1 font-medium text-foreground">Admin Dashboard</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full h-12 text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <LogOut className="w-5 h-5 mr-2" /> Log Out
          </Button>
        </div>
      </div>
    );
  }

  // ── Customer / Owner ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-shop px-4 pt-6 pb-8 rounded-b-3xl">
        <h1 className="text-white text-xl font-bold mb-4">Account</h1>
        <div className="bg-white rounded-2xl p-4 card-elevated">
          <div className="flex items-center gap-3">
            <div className="rounded-full w-14 h-14 bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-foreground truncate">{customer.name}</h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3" /> {customer.phone}
              </p>
              {customer.email && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {customer.email}
                </p>
              )}
            </div>
            <span className="text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-1 shrink-0">
              {role === "owner" ? "Owner" : role === "product_manager" ? "Product Manager" : "Customer"}
            </span>
          </div>
          {customer.delivery_location && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 shrink-0" />
              <span>{customer.delivery_location}</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 mt-5 space-y-4">

        {/* ── Rewards Wallet ─────────────────────────────────────────────── */}
        <div className="bg-card rounded-xl p-4 card-elevated border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-primary fill-primary" />
              <h3 className="font-bold text-foreground text-sm">Rewards Wallet</h3>
            </div>
            <Link to="/shop/rewards" className="text-xs text-primary font-medium">
              View Rewards →
            </Link>
          </div>
          <div className="flex items-end gap-1.5">
            <span className="text-3xl font-black text-foreground">{loyaltyPoints}</span>
            <span className="text-sm text-muted-foreground mb-0.5">points</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            ≈ KSh {loyaltyPoints} discount value · Redeemable at checkout
          </p>
          <p className="text-[10px] text-amber-600 font-medium mt-0.5">
            Loyalty points only — cannot be withdrawn as cash
          </p>
        </div>

        {/* ── Stery Earn Wallet ──────────────────────────────────────────── */}
        <div className="bg-card rounded-xl p-4 card-elevated border border-accent/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              <h3 className="font-bold text-foreground text-sm">Stery Earn Wallet</h3>
            </div>
            <Link to="/earn/dashboard" className="text-xs text-accent font-medium">
              View Earnings →
            </Link>
          </div>
          <div className="flex gap-5 items-end">
            <div>
              <span className="text-2xl font-black text-foreground">KSh {earnConfirmed}</span>
              <p className="text-xs text-muted-foreground">Confirmed earnings</p>
            </div>
            {earnPending > 0 && (
              <div className="border-l border-border pl-5">
                <span className="text-lg font-bold text-amber-600">KSh {earnPending}</span>
                <p className="text-xs text-muted-foreground">Pending approval</p>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Commission from product sales · Withdrawals coming soon
          </p>
        </div>

        {/* ── Birthday bonus ─────────────────────────────────────────────── */}
        <div className="bg-card rounded-xl p-4 card-elevated border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Cake className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">Birthday Reward</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Set your birthday to earn 50 bonus points on your special day 🎂
          </p>
          <input
            type="date"
            value={customer.birthday || ""}
            onChange={(e) => updateCustomer({ birthday: e.target.value })}
            className="w-full bg-secondary rounded-lg py-2.5 px-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* ── Main menu ──────────────────────────────────────────────────── */}
        <div className="bg-card rounded-xl overflow-hidden card-elevated">

          {/* Admin Dashboard — owner and product_manager */}
          {(role === "owner" || role === "product_manager") && (
            <Link
              to="/admin/orders"
              className="flex items-center gap-4 p-4 hover:bg-secondary transition-colors border-b border-border"
            >
              <LayoutDashboard className="w-5 h-5 text-purple-500" />
              <span className="flex-1 font-medium text-foreground">Admin Dashboard</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Link>
          )}

          <Link
            to="/shop/orders"
            className="flex items-center gap-4 p-4 hover:bg-secondary transition-colors border-b border-border"
          >
            <ClipboardList className="w-5 h-5 text-muted-foreground" />
            <span className="flex-1 font-medium text-foreground">My Orders</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>

          <Link
            to="/shop/rewards"
            className="flex items-center gap-4 p-4 hover:bg-secondary transition-colors border-b border-border"
          >
            <Star className="w-5 h-5 text-muted-foreground" />
            <span className="flex-1 font-medium text-foreground">Rewards Wallet</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>

          <Link
            to="/earn"
            onClick={() => setMode("earn")}
            className="flex items-center gap-4 p-4 hover:bg-secondary transition-colors border-b border-border"
          >
            <TrendingUp className="w-5 h-5 text-accent" />
            <div className="flex-1">
              <span className="font-medium text-foreground block">Earn with Stery</span>
              <span className="text-xs text-muted-foreground">Share products and earn commissions</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>

          {/* Delivery Addresses — placeholder, no dedicated page yet */}
          <button className="w-full flex items-center gap-4 p-4 hover:bg-secondary transition-colors border-b border-border">
            <MapPin className="w-5 h-5 text-muted-foreground" />
            <span className="flex-1 text-left font-medium text-foreground">Delivery Addresses</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Settings — placeholder */}
          <button className="w-full flex items-center gap-4 p-4 hover:bg-secondary transition-colors border-b border-border">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <span className="flex-1 text-left font-medium text-foreground">Settings</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Help & Support — inline expand */}
          <div>
            <button
              onClick={() => setShowHelp((v) => !v)}
              className="w-full flex items-center gap-4 p-4 hover:bg-secondary transition-colors"
            >
              <HelpCircle className="w-5 h-5 text-muted-foreground" />
              <span className="flex-1 text-left font-medium text-foreground">Help & Support</span>
              {showHelp
                ? <ChevronUp className="w-5 h-5 text-muted-foreground" />
                : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </button>
            {showHelp && (
              <div className="px-4 pb-4 pt-1 bg-muted/40 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Contact Stery Customer Care:</p>
                <div className="flex gap-2">
                  <a href={`tel:${STERY_PHONE}`} className="flex-1">
                    <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs">
                      <PhoneCall className="w-3.5 h-3.5" /> Call Stery
                    </Button>
                  </a>
                  <a
                    href={`https://wa.me/${STERY_WHATSAPP}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs text-accent border-accent/30">
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </Button>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Logout */}
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full h-12 text-destructive border-destructive/30 hover:bg-destructive/10"
        >
          <LogOut className="w-5 h-5 mr-2" /> Log Out
        </Button>

        <p className="text-center text-xs text-muted-foreground pb-2">Stery Kenya v1.0.0 🇰🇪</p>
      </div>
    </div>
  );
};

export default Profile;
