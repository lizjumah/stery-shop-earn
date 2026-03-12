import { products } from "@/data/products";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { ShoppingCart, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const BuyAgainSection = () => {
  const { addToCart, orders } = useApp();
  const navigate = useNavigate();

  // Get previously purchased product IDs from placed orders
  const purchasedIds = Array.from(
    new Set(
      orders
        .filter((o) => o.status !== "cancelled")
        .flatMap((o) => o.items.map((i) => i.productId))
    )
  );

  const buyAgainProducts = purchasedIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined && p.inStock)
    .slice(0, 8);

  if (buyAgainProducts.length === 0) return null;

  const handleQuickAdd = (productId: string, productName: string) => {
    addToCart(productId);
    toast(`${productName} added to cart!`, {
      action: { label: "View Cart", onClick: () => navigate("/shop/cart") },
    });
  };

  const handleAddAll = () => {
    buyAgainProducts.forEach((p) => addToCart(p.id));
    toast(`${buyAgainProducts.length} items added to cart!`, {
      action: { label: "View Cart", onClick: () => navigate("/shop/cart") },
    });
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Buy Again</h2>
        </div>
        <Button size="sm" variant="outline" onClick={handleAddAll} className="text-xs gap-1.5">
          <ShoppingCart className="w-3.5 h-3.5" />
          Add All to Cart
        </Button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {buyAgainProducts.map((product) => (
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
