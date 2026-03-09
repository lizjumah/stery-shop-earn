import { userData } from "@/data/user";
import { useApp } from "@/contexts/AppContext";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import {
  User, Phone, Mail, MapPin, ChevronRight, LogOut, HelpCircle, Settings, Star, TrendingUp, ClipboardList, Cake, Shield, LayoutDashboard
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();
  const { mode, setMode, loyaltyPoints, birthday, setBirthday } = useApp();

  const handleSwitchMode = () => {
    const newMode = mode === "shop" ? "earn" : "shop";
    setMode(newMode);
    navigate(newMode === "shop" ? "/shop" : "/earn");
  };

  const handleLogout = () => {
    setMode(null);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className={`px-4 pt-6 pb-8 rounded-b-3xl ${mode === "earn" ? "gradient-earn" : "gradient-shop"}`}>
        <h1 className="text-white text-xl font-bold mb-6">Profile</h1>

        <div className="bg-white rounded-2xl p-4 card-elevated">
          <div className="flex items-center gap-4">
            <div className={`rounded-full w-16 h-16 flex items-center justify-center ${mode === "earn" ? "bg-accent/10" : "bg-primary/10"}`}>
              <User className={`w-8 h-8 ${mode === "earn" ? "text-accent" : "text-primary"}`} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground">{userData.name}</h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{userData.phone}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{userData.email}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span>{userData.address}</span>
          </div>

          <div className="mt-3 bg-secondary rounded-lg px-3 py-2">
            <span className="text-xs text-muted-foreground">User Type: </span>
            <span className="text-xs font-semibold text-foreground">{mode === "earn" ? "Reseller" : "Customer"}</span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            {mode === "shop" ? (
              <>
                <Link to="/shop/rewards" className="bg-primary/5 rounded-lg p-3 text-center">
                  <Star className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold text-foreground">{loyaltyPoints}</p>
                  <p className="text-xs text-muted-foreground">Stery Points</p>
                </Link>
                <Link to="/shop/rewards" className="bg-primary/5 rounded-lg p-3 text-center">
                  <span className="text-2xl">🎫</span>
                  <p className="text-lg font-bold text-foreground">KSh {loyaltyPoints}</p>
                  <p className="text-xs text-muted-foreground">Reward Value</p>
                </Link>
              </>
            ) : (
              <>
                <div className="bg-accent/5 rounded-lg p-3 text-center">
                  <TrendingUp className="w-5 h-5 text-accent mx-auto mb-1" />
                  <p className="text-lg font-bold text-foreground">KSh {userData.totalEarnings.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Earned</p>
                </div>
                <div className="bg-accent/5 rounded-lg p-3 text-center">
                  <User className="w-5 h-5 text-accent mx-auto mb-1" />
                  <p className="text-lg font-bold text-foreground">{userData.referredUsers}</p>
                  <p className="text-xs text-muted-foreground">Referrals</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 mt-6">
        {/* Birthday Field */}
        {mode === "shop" && (
          <div className="bg-card rounded-xl p-4 card-elevated mb-4 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Cake className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">Birthday Reward</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Set your birthday to earn 50 bonus points! 🎂</p>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="w-full bg-secondary rounded-lg py-2.5 px-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        {/* Switch Mode */}
        <Button onClick={handleSwitchMode} variant="outline" className="w-full h-14 mb-4 justify-between">
          <span className="font-medium">Switch to {mode === "shop" ? "Earn" : "Shop"} Mode</span>
          <ChevronRight className="w-5 h-5" />
        </Button>

        {/* Menu */}
        <div className="bg-card rounded-xl overflow-hidden card-elevated mb-4">
          <Link to="/shop/orders" className="w-full flex items-center gap-4 p-4 hover:bg-secondary transition-colors border-b border-border">
            <ClipboardList className="w-5 h-5 text-muted-foreground" />
            <span className="flex-1 text-left font-medium text-foreground">My Orders</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>
          <Link to="/admin" className="w-full flex items-center gap-4 p-4 hover:bg-secondary transition-colors border-b border-border">
            <LayoutDashboard className="w-5 h-5 text-muted-foreground" />
            <span className="flex-1 text-left font-medium text-foreground">Admin Dashboard</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>
          {mode === "shop" && (
            <Link to="/shop/rewards" className="w-full flex items-center gap-4 p-4 hover:bg-secondary transition-colors border-b border-border">
              <Star className="w-5 h-5 text-muted-foreground" />
              <span className="flex-1 text-left font-medium text-foreground">Rewards Wallet</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Link>
          )}
          {[
            { icon: MapPin, label: "Delivery Addresses" },
            { icon: Settings, label: "Settings" },
            { icon: HelpCircle, label: "Help & Support" },
          ].map((item, i) => (
            <button key={i} className={`w-full flex items-center gap-4 p-4 hover:bg-secondary transition-colors ${i < 2 ? "border-b border-border" : ""}`}>
              <item.icon className="w-5 h-5 text-muted-foreground" />
              <span className="flex-1 text-left font-medium text-foreground">{item.label}</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Customer Support */}
        <div className="bg-card rounded-xl p-4 card-elevated mb-4 text-center space-y-2">
          <p className="text-sm text-muted-foreground">Need help? Contact Stery Customer Care</p>
          <div className="flex gap-2 justify-center">
            <a href="tel:+254794560657">
              <Button size="sm" variant="outline" className="text-xs gap-1">📞 Call Stery</Button>
            </a>
            <a href="https://wa.me/254794560657" target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="text-xs gap-1">💬 WhatsApp Stery</Button>
            </a>
          </div>
        </div>

        {/* Edit Profile */}
        <Button variant="outline" className="w-full h-12 mb-3">Edit Profile</Button>

        {/* Logout */}
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full h-12 text-destructive border-destructive/30 hover:bg-destructive/10"
        >
          <LogOut className="w-5 h-5 mr-2" />Log Out
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-6">Stery Kenya v1.0.0 🇰🇪</p>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
