import { Home, ShoppingBag, DollarSign, Gift, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Home", path: "/shop" },
  { icon: ShoppingBag, label: "Shop", path: "/shop/browse" },
  { icon: DollarSign, label: "Earn", path: "/earn" },
  { icon: Gift, label: "Rewards", path: "/shop/rewards" },
  { icon: User, label: "Account", path: "/profile" },
];

export const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-pb z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path === "/shop" && location.pathname === "/shop") ||
            (item.path === "/shop/browse" && location.pathname.startsWith("/shop/") && !(["/shop/rewards"].includes(location.pathname)) && location.pathname !== "/shop") ||
            (item.path === "/earn" && location.pathname.startsWith("/earn"));

          // More precise active check
          const active =
            item.path === "/shop"
              ? location.pathname === "/shop"
              : item.path === "/shop/browse"
              ? location.pathname === "/shop/browse" || (location.pathname.startsWith("/shop/") && !["/shop", "/shop/rewards"].includes(location.pathname) && location.pathname !== "/shop/rewards")
              : item.path === "/earn"
              ? location.pathname.startsWith("/earn")
              : item.path === "/shop/rewards"
              ? location.pathname === "/shop/rewards"
              : location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center touch-target px-2 transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
