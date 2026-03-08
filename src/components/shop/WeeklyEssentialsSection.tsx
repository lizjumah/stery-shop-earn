import { products } from "@/data/products";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { ShoppingCart, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const ESSENTIAL_IDS = ["1", "2", "14", "11", "3", "4", "12"];

export const WeeklyEssentialsSection = () => {
  const { addToCart } = useApp();
  const navigate = useNavigate();

  const essentials = ESSENTIAL_IDS
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined && p.inStock);

  const handleQuickAdd = (productId: string, productName: string) => {
    addToCart(productId);
    toast(`${productName} added to cart!`, {
      action: { label: "View Cart", onClick: () => navigate("/shop/cart") },
    });
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-1">
        <RefreshCw className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Weekly Essentials</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-3">Running low on your weekly essentials?</p>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {essentials.map((product) => (
          <div
            key={product.id}
            className="bg-card rounded-xl p-3 card-elevated flex-shrink-0 w-32 flex flex-col items-center gap-2"
          >
            <img
              src={product.image}
              alt={product.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
            <h3 className="text-xs font-semibold text-foreground text-center line-clamp-2 leading-tight">
              {product.name}
            </h3>
            <p className="text-sm font-bold text-primary">KSh {product.price}</p>
            <Button
              size="sm"
              className="w-full h-8 text-xs bg-primary hover:bg-primary/90"
              onClick={() => handleQuickAdd(product.id, product.name)}
            >
              <ShoppingCart className="w-3.5 h-3.5 mr-1" />
              Add
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
