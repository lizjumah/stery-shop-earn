import { Link } from "react-router-dom";
import {
  ShoppingBag,
  Package,
  Users,
  Bell,
  BarChart2,
  Award,
  Truck,
  Upload,
} from "lucide-react";
import { useCustomer, getCustomerRole } from "@/contexts/CustomerContext";

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
    </div>
  );
};

export default AdminOverview;
