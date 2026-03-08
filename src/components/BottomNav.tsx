import { Home, ShoppingCart, Gift, User, TrendingUp, Share2, Wallet, LayoutGrid } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

const shopNavItems = [
  { icon: Home, label: "Home", path: "/shop" },
  { icon: ShoppingCart, label: "Shop", path: "/shop/browse" },
  { icon: LayoutGrid, label: "Categories", path: "/shop/categories" },
  { icon: Wallet, label: "Rewards", path: "/shop/rewards" },
  { icon: User, label: "Profile", path: "/profile" },
];

const earnNavItems = [
  { icon: Home, label: "Home", path: "/earn" },
  { icon: LayoutGrid, label: "Products", path: "/earn/products" },
  { icon: TrendingUp, label: "Earnings", path: "/earn/dashboard" },
  { icon: Share2, label: "Referrals", path: "/earn/referrals" },
  { icon: User, label: "Profile", path: "/profile" },
];

export const BottomNav = () => {
  const { mode, cartItemCount } = useApp();
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
                "flex flex-col items-center justify-center touch-target px-2 transition-colors relative",
                isActive ? activeColor : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              {item.label === "Cart" && cartItemCount > 0 && (
                <span className="absolute -top-1 right-0 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
              <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
