import { useProducts } from "@/hooks/useProducts";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Props {
  productId: string;
}

export const FrequentlyBoughtTogether = ({ productId }: Props) => {
  const { addToCart } = useApp();
  const navigate = useNavigate();
  const { data: liveProducts = [] } = useProducts();

  const current = liveProducts.find((p) => p.id === productId);
  if (!current) return null;

  // Same-category recommendations, excluding the current product
  const sameCat = liveProducts.filter(
    (p) => p.id !== productId && p.inStock !== false && p.category === current.category
  );
  // Fill up to 3 with popular items if not enough in category
  const extras = liveProducts.filter(
    (p) => p.id !== productId && p.inStock !== false && !sameCat.find((r) => r.id === p.id)
  );
  const paired = [...sameCat, ...extras].slice(0, 3);

  if (paired.length === 0) return null;

  const totalPrice = paired.reduce((sum, p) => sum + p.price, 0);

  const handleAddOne = (pid: string, name: string) => {
    addToCart(pid);
    toast(`${name} added to cart!`, {
      action: { label: "View Cart", onClick: () => navigate("/shop/cart") },
    });
  };

  const handleAddAll = () => {
    paired.forEach((p) => addToCart(p.id));
    toast(`${paired.length} items added to cart!`, {
      action: { label: "View Cart", onClick: () => navigate("/shop/cart") },
    });
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="font-bold text-foreground">Frequently Bought Together</h2>
      </div>

      <div className="space-y-2 mb-3">
        {paired.map((product) => (
          <div key={product.id} className="bg-card rounded-xl p-3 flex items-center gap-3 card-elevated">
            <img src={product.image} alt={product.name} className="w-14 h-14 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground truncate">{product.name}</h3>
              <p className="text-primary font-bold text-sm">KSh {product.price}</p>
            </div>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 h-9 px-3"
              onClick={() => handleAddOne(product.id, product.name)}
            >
              <ShoppingCart className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        onClick={handleAddAll}
        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
      >
        <ShoppingCart className="w-4 h-4 mr-2" />
        Add All to Cart — KSh {totalPrice}
      </Button>
    </div>
  );
};
