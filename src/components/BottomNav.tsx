import { Home, Search, Gift, User, TrendingUp, Share2, Wallet } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

const shopNavItems = [
  { icon: Home, label: "Home", path: "/shop" },
  { icon: Gift, label: "Offers", path: "/shop/offers" },
  { icon: Wallet, label: "Rewards", path: "/shop/rewards" },
  { icon: User, label: "Profile", path: "/profile" },
];

const earnNavItems = [
  { icon: Home, label: "Products", path: "/earn" },
  { icon: TrendingUp, label: "Earnings", path: "/earn/dashboard" },
  { icon: Share2, label: "Referrals", path: "/earn/referrals" },
  { icon: User, label: "Profile", path: "/profile" },
];

export const BottomNav = () => {
  const { mode } = useApp();
  const location = useLocation();
  
  const navItems = mode === "earn" ? earnNavItems : shopNavItems;
  const activeColor = mode === "earn" ? "text-accent" : "text-primary";

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-pb z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center touch-target px-4 transition-colors",
                isActive ? activeColor : "text-muted-foreground"
              )}
            >
              <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
