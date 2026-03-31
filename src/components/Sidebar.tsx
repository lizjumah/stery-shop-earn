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
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* ── Sidebar header ── */}
      <div className="border-b border-border">

        {/* Expanded: full-width logo + collapse toggle */}
        {!collapsed && (
          <div className="flex items-center justify-between px-3 py-2">
            <Link to="/shop" className="flex-1 min-w-0">
              <img
                src={steryLogo}
                alt="Stery Supermarket"
                className="h-28 w-auto max-w-full object-contain object-left"
              />
            </Link>
            <button
              onClick={onToggle}
              className="shrink-0 p-1 rounded-full hover:bg-muted ml-1"
              aria-label="Collapse sidebar"
            >
              <Menu className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Collapsed: centred small logo + toggle */}
        {collapsed && (
          <div className="flex flex-col items-center gap-1.5 py-2">
            <Link to="/shop" aria-label="Stery Supermarket home">
              <img
                src={steryLogo}
                alt="Stery Supermarket"
                className="h-14 w-auto object-contain"
              />
            </Link>
            <button
              onClick={onToggle}
              className="p-1 rounded-full hover:bg-muted"
              aria-label="Expand sidebar"
            >
              <Menu className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>

      <nav className="mt-3 flex-1 flex flex-col space-y-1 px-2">
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
                "flex items-center py-2 px-3 rounded-lg transition-colors",
                active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted",
                collapsed && "justify-center"
              )}
            >
              <item.icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              {!collapsed && <span className="ml-2 font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
