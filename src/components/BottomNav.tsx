import { Home, Package, DollarSign, Gift, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home,    label: "Home",    path: "/shop" },
  { icon: Package, label: "Orders",  path: "/shop/orders" },
  { icon: DollarSign, label: "Earn", path: "/earn" },
  { icon: Gift,    label: "Rewards", path: "/shop/rewards" },
  { icon: User,    label: "Account", path: "/profile" },
];

export const BottomNav: React.FC<{className?: string}> = ({ className = "" }) => {
  const location = useLocation();

  return (
    <nav className={cn("fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-pb z-50 lg:hidden", className)}>
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          // Home is active for all /shop/* routes not owned by another tab
          const ORDERS_PATHS = ["/shop/orders", "/shop/order/"];
          const active =
            item.path === "/shop"
              ? location.pathname === "/shop" ||
                (location.pathname.startsWith("/shop/") &&
                  !ORDERS_PATHS.some((p) => location.pathname.startsWith(p)) &&
                  location.pathname !== "/shop/rewards")
              : item.path === "/shop/orders"
              ? location.pathname.startsWith("/shop/order")
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
                active ? "text-red-700 font-semibold" : "text-red-500"
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
