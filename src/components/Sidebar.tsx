import { Home, Package, DollarSign, Gift, User, Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import steryLogo from "@/assets/stery-logo.png.png";

const navItems = [
  { icon: Home,    label: "Home",    path: "/shop" },
  { icon: Package, label: "Orders",  path: "/shop/orders" },
  { icon: DollarSign, label: "Earn with Stery", path: "/earn" },
  { icon: Gift,    label: "Rewards", path: "/shop/rewards" },
  { icon: User,    label: "Account", path: "/profile" },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, onToggle }) => {
  const location = useLocation();

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col fixed inset-y-0 left-0 bg-card border-r border-border z-50 transition-width duration-200",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* ── Sidebar header ── */}
      <div className="border-b border-border/60">

        {/* Expanded: logo + collapse toggle */}
        {!collapsed && (
          <div className="flex items-center justify-between px-4 py-3">
            <Link to="/shop" className="flex-1 min-w-0">
              <img
                src={steryLogo}
                alt="Stery Supermarket"
                className="h-10 w-auto max-w-full object-contain object-left"
              />
            </Link>
            <button
              onClick={onToggle}
              className="shrink-0 p-1.5 rounded-lg hover:bg-muted transition-colors ml-2"
              aria-label="Collapse sidebar"
            >
              <Menu className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Collapsed: icon + toggle stacked */}
        {collapsed && (
          <div className="flex flex-col items-center gap-2 py-3">
            <Link to="/shop" aria-label="Stery Supermarket home">
              <img
                src={steryLogo}
                alt="Stery Supermarket"
                className="h-8 w-auto object-contain"
              />
            </Link>
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label="Expand sidebar"
            >
              <Menu className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>

      <nav className="mt-2 flex-1 flex flex-col gap-0.5 px-2 py-2">
        {navItems.map((item) => {
          const active =
            item.path === "/shop"
              ? location.pathname === "/shop" ||
                (location.pathname.startsWith("/shop/") &&
                  !location.pathname.startsWith("/shop/order") &&
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
                "flex items-center py-2.5 px-3 rounded-lg text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-0"
              )}
            >
              <item.icon className="w-4.5 h-4.5 shrink-0" strokeWidth={active ? 2.5 : 2} />
              {!collapsed && <span className="ml-3 truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
