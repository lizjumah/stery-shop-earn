import { products } from "@/data/products";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, CakeSlice } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const FreshTodaySection = () => {
  const { addToCart } = useApp();
  const navigate = useNavigate();

  const bakeryProducts = products.filter((p) => p.category === "Bakery" && p.inStock);

  if (bakeryProducts.length === 0) return null;

  const handleQuickAdd = (productId: string, productName: string) => {
    addToCart(productId);
    toast(`${productName} added to cart!`, {
      action: { label: "View Cart", onClick: () => navigate("/shop/cart") },
    });
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <CakeSlice className="w-5 h-5 text-accent" />
        <h2 className="text-lg font-bold text-foreground">Fresh Today from Stery Bakery</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {bakeryProducts.map((product) => (
          <div
            key={product.id}
            className="bg-card rounded-xl overflow-hidden card-elevated flex-shrink-0 w-40"
          >
            <div className="relative">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-28 object-cover"
              />
              <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground text-[10px] gap-1">
                🍞 Freshly baked today
              </Badge>
            </div>
            <div className="p-3 flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-foreground line-clamp-1">{product.name}</h3>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-primary">KSh {product.price}</p>
                <Button
                  size="icon"
                  className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90"
                  onClick={() => handleQuickAdd(product.id, product.name)}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
