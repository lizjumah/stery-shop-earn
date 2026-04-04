import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ShoppingBag,
  Package,
  Users,
  Bell,
  BarChart2,
  Award,
  Truck,
  Upload,
  ImageIcon,
} from "lucide-react";
import { useCustomer, getCustomerRole } from "@/contexts/CustomerContext";
import { API_BASE, getAdminHeaders } from "@/lib/api/client";

interface ImageActivityRow {
  staff_name: string;
  products_updated: number;
  last_activity: string;
}

const ALL_CARDS = [
  {
    title: "Orders",
    description: "View and manage customer orders",
    path: "/admin/orders",
    icon: ShoppingBag,
    ownerOnly: false,
  },
  {
    title: "Products",
    description: "Add, edit and manage the catalogue",
    path: "/admin/products",
    icon: Package,
    ownerOnly: false,
  },
  {
    title: "Stock Alerts",
    description: "Monitor low and out-of-stock items",
    path: "/admin/alerts",
    icon: Bell,
    ownerOnly: false,
  },
  {
    title: "Staff",
    description: "Manage staff accounts and roles",
    path: "/admin/staff",
    icon: Users,
    ownerOnly: true,
  },
  {
    title: "Commissions",
    description: "Review and approve reseller commissions",
    path: "/admin/commissions",
    icon: Award,
    ownerOnly: true,
  },
  {
    title: "Reports",
    description: "Sales and performance reports",
    path: "/admin/reports",
    icon: BarChart2,
    ownerOnly: true,
  },
  {
    title: "Delivery Routes",
    description: "Manage delivery zones and routes",
    path: "/admin/delivery-routes",
    icon: Truck,
    ownerOnly: true,
  },
  {
    title: "Bulk Import",
    description: "Import products via CSV",
    path: "/admin/import",
    icon: Upload,
    ownerOnly: true,
  },
];

const AdminOverview = () => {
  const { customer } = useCustomer();
  const isOwner = getCustomerRole(customer) === "owner";
  const cards = ALL_CARDS.filter((c) => !c.ownerOnly || isOwner);

  const [imageActivity, setImageActivity] = useState<ImageActivityRow[]>([]);

  useEffect(() => {
    if (!isOwner) return;
    fetch(`${API_BASE}/api/admin/image-activity/today`, { headers: getAdminHeaders() })
      .then((r) => r.ok ? r.json() : [])
      .then(setImageActivity)
      .catch(() => {});
  }, [isOwner]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 pt-5 pb-4">
        <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Stery Supermarket — control centre
        </p>
      </div>

      <div className="px-4 grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <Link
            key={card.path}
            to={card.path}
            className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:border-primary/50 active:scale-[0.98] transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <card.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm leading-tight">
                {card.title}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                {card.description}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {isOwner && (
        <div className="px-4 mt-6">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Today's Product Image Activity</h2>
          </div>
          {imageActivity.length === 0 ? (
            <p className="text-xs text-muted-foreground bg-secondary/50 rounded-xl px-4 py-3">
              No image uploads recorded today.
            </p>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-3 px-4 py-2 bg-secondary/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                <span>Staff</span>
                <span className="text-center">Products</span>
                <span className="text-right">Last Active</span>
              </div>
              {imageActivity.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-3 px-4 py-3 text-sm border-t border-border first:border-t-0"
                >
                  <span className="font-medium text-foreground truncate">{row.staff_name}</span>
                  <span className="text-center text-primary font-semibold">{row.products_updated}</span>
                  <span className="text-right text-xs text-muted-foreground">
                    {new Date(row.last_activity).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminOverview;
