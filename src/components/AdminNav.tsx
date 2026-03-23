import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useCustomer, getCustomerRole } from "@/contexts/CustomerContext";

const NAV_ITEMS = [
  { label: "Overview",    path: "/admin",                     ownerOnly: false, exact: true  },
  { label: "Orders",      path: "/admin/orders",              ownerOnly: false, exact: false },
  { label: "Products",    path: "/admin/products",            ownerOnly: false, exact: false },
  { label: "Alerts",      path: "/admin/alerts",              ownerOnly: false, exact: false },
  { label: "Inv. Overview", path: "/admin/inventory",         ownerOnly: false, exact: true  },
  { label: "Master List", path: "/admin/inventory/master",    ownerOnly: false, exact: false },
  { label: "Stock Upload", path: "/admin/inventory/upload",   ownerOnly: false, exact: false },
  { label: "Staff",       path: "/admin/staff",               ownerOnly: true,  exact: false },
  { label: "Commissions", path: "/admin/commissions",         ownerOnly: true,  exact: false },
  { label: "Reports",     path: "/admin/reports",             ownerOnly: true,  exact: false },
  { label: "Audit Trail", path: "/admin/audit",               ownerOnly: true,  exact: false },
];

export const AdminNav: React.FC = () => {
  const { customer } = useCustomer();
  const location = useLocation();
  const isOwner = getCustomerRole(customer) === "owner";

  const items = NAV_ITEMS.filter((item) => !item.ownerOnly || isOwner);

  return (
    <div className="bg-card border-b border-border sticky top-0 z-40">
      <div className="flex overflow-x-auto scrollbar-hide px-2">
        {items.map((item) => {
          const active = item.exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "shrink-0 text-sm font-medium px-3 py-3 border-b-2 transition-colors whitespace-nowrap",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
