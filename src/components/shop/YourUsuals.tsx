import { products } from "@/data/products";
import { orderHistory } from "@/data/user";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { ShoppingCart, RotateCcw } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";

// Default usuals if no order history
const DEFAULT_USUAL_IDS = ["1", "2", "14", "4", "3", "12"];

export const YourUsuals = () => {
  const { orders, addToCart } = useApp();
  const navigate = useNavigate();

  // Collect product IDs from all orders (context orders + static history)
  const allOrders = [...orders, ...orderHistory];
  const frequency: Record<string, number> = {};
  allOrders
    .filter((o) => o.status !== "cancelled")
    .forEach((o) => o.items.forEach((item) => {
      frequency[item.productId] = (frequency[item.productId] || 0) + item.quantity;
    }));

  // Sort by frequency, fallback to defaults
  let usualIds: string[];
  if (Object.keys(frequency).length > 0) {
    usualIds = Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id)
      .slice(0, 6);
  } else {
    usualIds = DEFAULT_USUAL_IDS;
  }

  const usualProducts = usualIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p && p.inStock);

  if (usualProducts.length === 0) return null;

  const handleAdd = (id: string, name: string) => {
    addToCart(id);
    toast.success(`${name} added to cart!`, {
      action: { label: "View Cart", onClick: () => navigate("/shop/cart") },
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-4.5 h-4.5 text-primary" />
          <h2 className="font-bold text-foreground text-sm">Your Usuals</h2>
        </div>
        <Link to="/shop/browse" className="text-xs text-primary font-medium">See all</Link>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
        {usualProducts.map((p) => (
          <div
            key={p.id}
            className="bg-card rounded-xl border border-border card-elevated shrink-0 w-[130px] overflow-hidden"
          >
            <Link to={`/shop/product/${p.id}`}>
              <img src={p.image} alt={p.name} className="w-full h-24 object-cover" />
            </Link>
            <div className="p-2.5">
              <h3 className="text-xs font-semibold text-foreground truncate">{p.name}</h3>
              <p className="text-primary font-bold text-sm mt-0.5">KSh {p.price}</p>
              <Button
                size="sm"
                className="w-full mt-2 bg-primary hover:bg-primary/90 h-7 text-[11px] rounded-full"
                onClick={() => handleAdd(p.id, p.name)}
              >
                <ShoppingCart className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
