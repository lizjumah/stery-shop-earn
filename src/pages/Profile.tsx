import { userData } from "@/data/user";
import { useApp } from "@/contexts/AppContext";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Phone, 
  MapPin, 
  ChevronRight, 
  LogOut, 
  HelpCircle, 
  Settings,
  Star,
  TrendingUp
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();
  const { mode, setMode } = useApp();

  const handleSwitchMode = () => {
    const newMode = mode === "shop" ? "earn" : "shop";
    setMode(newMode);
    navigate(newMode === "shop" ? "/shop" : "/earn");
  };

  const handleLogout = () => {
    setMode(null);
    navigate("/");
  };

  const menuItems = [
    { icon: MapPin, label: "Delivery Addresses", path: "/profile/addresses" },
    { icon: Settings, label: "Settings", path: "/profile/settings" },
    { icon: HelpCircle, label: "Help & Support", path: "/profile/help" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className={`px-4 pt-6 pb-8 rounded-b-3xl ${mode === "earn" ? "gradient-earn" : "gradient-shop"}`}>
        <h1 className="text-white text-xl font-bold mb-6">Profile</h1>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl p-4 card-elevated">
          <div className="flex items-center gap-4">
            <div className={`rounded-full w-16 h-16 flex items-center justify-center ${
              mode === "earn" ? "bg-accent/10" : "bg-primary/10"
            }`}>
              <User className={`w-8 h-8 ${mode === "earn" ? "text-accent" : "text-primary"}`} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground">{userData.name}</h2>
              <div className="flex items-center gap-1 text-muted-foreground text-sm">
                <Phone className="w-3 h-3" />
                <span>{userData.phone}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            {mode === "shop" ? (
              <>
                <div className="bg-primary/5 rounded-lg p-3 text-center">
                  <Star className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold text-foreground">{userData.loyaltyPoints}</p>
                  <p className="text-xs text-muted-foreground">Points</p>
                </div>
                <div className="bg-primary/5 rounded-lg p-3 text-center">
                  <span className="text-2xl">🎫</span>
                  <p className="text-lg font-bold text-foreground">3</p>
                  <p className="text-xs text-muted-foreground">Vouchers</p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-accent/5 rounded-lg p-3 text-center">
                  <TrendingUp className="w-5 h-5 text-accent mx-auto mb-1" />
                  <p className="text-lg font-bold text-foreground">KSh {userData.totalEarnings}</p>
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
        {/* Switch Mode */}
        <Button
          onClick={handleSwitchMode}
          variant="outline"
          className="w-full h-14 mb-6 justify-between"
        >
          <span className="font-medium">
            Switch to {mode === "shop" ? "Earn" : "Shop"} Mode
          </span>
          <ChevronRight className="w-5 h-5" />
        </Button>

        {/* Menu Items */}
        <div className="bg-card rounded-xl overflow-hidden card-elevated mb-6">
          {menuItems.map((item, index) => (
            <button
              key={item.path}
              className={`w-full flex items-center gap-4 p-4 hover:bg-secondary transition-colors ${
                index !== menuItems.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <item.icon className="w-5 h-5 text-muted-foreground" />
              <span className="flex-1 text-left font-medium text-foreground">
                {item.label}
              </span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full h-14 text-destructive border-destructive/30 hover:bg-destructive/10"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Log Out
        </Button>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Stery Kenya v1.0.0
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
