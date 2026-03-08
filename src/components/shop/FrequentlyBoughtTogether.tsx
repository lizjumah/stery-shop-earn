import { products } from "@/data/products";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// Map product IDs to commonly bought-together product IDs
const pairings: Record<string, string[]> = {
  "1": ["2", "14", "4"],     // Bread → Milk, Eggs, Cooking Oil
  "2": ["1", "3", "14"],     // Milk → Bread, Sugar, Eggs
  "3": ["11", "4", "12"],    // Sugar → Flour, Cooking Oil, Tea Leaves
  "4": ["3", "11", "13"],    // Cooking Oil → Sugar, Flour, Rice
  "11": ["3", "4", "14"],    // Flour → Sugar, Cooking Oil, Eggs
  "12": ["3", "2", "1"],     // Tea Leaves → Sugar, Milk, Bread
  "13": ["4", "3", "11"],    // Rice → Cooking Oil, Sugar, Flour
  "14": ["1", "2", "3"],     // Eggs → Bread, Milk, Sugar
};

// Fallback: suggest essentials
const DEFAULT_PAIRINGS = ["1", "2", "3"];

interface Props {
  productId: string;
}

export const FrequentlyBoughtTogether = ({ productId }: Props) => {
  const { addToCart } = useApp();
  const navigate = useNavigate();

  const pairedIds = (pairings[productId] || DEFAULT_PAIRINGS).filter((id) => id !== productId);
  const pairedProducts = pairedIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined && p.inStock)
    .slice(0, 3);

  if (pairedProducts.length === 0) return null;

  const totalPrice = pairedProducts.reduce((sum, p) => sum + p.price, 0);

  const handleAddOne = (productId: string, name: string) => {
    addToCart(productId);
    toast(`${name} added to cart!`, {
      action: { label: "View Cart", onClick: () => navigate("/shop/cart") },
    });
  };

  const handleAddAll = () => {
    pairedProducts.forEach((p) => addToCart(p.id));
    toast(`${pairedProducts.length} items added to cart!`, {
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
        {pairedProducts.map((product) => (
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
