import { products } from "@/data/products";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Bundle {
  id: string;
  name: string;
  emoji: string;
  productIds: string[];
}

const bundles: Bundle[] = [
  { id: "breakfast", name: "Breakfast Bundle", emoji: "🍳", productIds: ["1", "2", "14"] },
  { id: "teatime", name: "Tea Time Bundle", emoji: "☕", productIds: ["12", "3", "1"] },
  { id: "family", name: "Family Essentials", emoji: "👨‍👩‍👧‍👦", productIds: ["11", "4", "3", "13"] },
];

export const QuickBundlesSection = () => {
  const { addToCart } = useApp();
  const navigate = useNavigate();

  const handleAddBundle = (bundle: Bundle) => {
    bundle.productIds.forEach((id) => addToCart(id));
    toast(`${bundle.name} added to cart!`, {
      action: { label: "View Cart", onClick: () => navigate("/shop/cart") },
    });
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Package className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Quick Grocery Bundles</h2>
      </div>
      <div className="space-y-3">
        {bundles.map((bundle) => {
          const bundleProducts = bundle.productIds
            .map((id) => products.find((p) => p.id === id))
            .filter((p): p is NonNullable<typeof p> => p !== undefined);
          const totalPrice = bundleProducts.reduce((sum, p) => sum + p.price, 0);

          return (
            <div key={bundle.id} className="bg-card rounded-xl p-4 card-elevated border border-border">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-foreground">
                    {bundle.emoji} {bundle.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {bundleProducts.map((p) => p.name).join(" + ")}
                  </p>
                </div>
                <span className="text-lg font-bold text-primary">KSh {totalPrice}</span>
              </div>

              <div className="flex gap-2 mb-3">
                {bundleProducts.map((product) => (
                  <div key={product.id} className="flex-1 flex flex-col items-center">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                    <span className="text-[10px] text-muted-foreground mt-1 text-center line-clamp-1">
                      {product.name}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                className="w-full bg-primary hover:bg-primary/90"
                onClick={() => handleAddBundle(bundle)}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Add Bundle to Cart
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
