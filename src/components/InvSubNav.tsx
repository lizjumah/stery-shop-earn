import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const SUB_ITEMS = [
  { label: "Overview",         path: "/admin/inventory",        exact: true },
  { label: "Master Inventory", path: "/admin/inventory/master", exact: false },
  { label: "Stock Upload",     path: "/admin/inventory/upload", exact: false },
];

export function InvSubNav() {
  const { pathname } = useLocation();

  return (
    <div className="flex gap-0 border-b border-border -mx-0 mb-2">
      {SUB_ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.path
          : pathname.startsWith(item.path);

        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "text-sm px-4 py-2 border-b-2 -mb-px transition-colors whitespace-nowrap",
              active
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
