import { products } from "@/data/products";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// Category-based recommendations: show products from the same category, excluding current
export const CustomersAlsoBuy = ({ productId }: { productId: string }) => {
  const { addToCart } = useApp();
  const navigate = useNavigate();

  const current = products.find((p) => p.id === productId);
  if (!current) return null;

  const recommendations = products
    .filter((p) => p.id !== productId && p.inStock && p.category === current.category)
    .slice(0, 4);

  // If not enough in same category, fill from other popular items
  if (recommendations.length < 3) {
    const extras = products
      .filter((p) => p.id !== productId && p.inStock && !recommendations.find((r) => r.id === p.id))
      .slice(0, 4 - recommendations.length);
    recommendations.push(...extras);
  }

  if (recommendations.length === 0) return null;

  const handleAdd = (id: string, name: string) => {
    addToCart(id);
    toast.success(`${name} added to cart!`, {
      action: { label: "View Cart", onClick: () => navigate("/shop/cart") },
    });
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-5 h-5 text-primary" />
        <h2 className="font-bold text-foreground">Customers Also Buy</h2>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {recommendations.map((p) => (
          <div key={p.id} className="bg-card rounded-xl p-3 border border-border">
            <img src={p.image} alt={p.name} className="w-full aspect-square rounded-lg object-cover mb-2" />
            <h3 className="font-semibold text-xs text-foreground truncate">{p.name}</h3>
            <p className="text-primary font-bold text-sm mt-0.5">KSh {p.price}</p>
            <Button
              size="sm"
              className="w-full mt-2 bg-primary hover:bg-primary/90 h-8 text-xs"
              onClick={() => handleAdd(p.id, p.name)}
            >
              <ShoppingCart className="w-3.5 h-3.5 mr-1" />
              Add to Cart
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
