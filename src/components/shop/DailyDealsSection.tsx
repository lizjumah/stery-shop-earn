import { products } from "@/data/products";
import { getTodayDeals, getGreeting } from "@/data/dailyDeals";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Sun, Clock, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const DailyDealsSection = () => {
  const { addToCart } = useApp();
  const navigate = useNavigate();

  const greeting = getGreeting();
  const todayDeals = getTodayDeals();
  const dealProducts = todayDeals
    .map((deal) => products.find((p) => p.id === deal.productId))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  const handleQuickAdd = (productId: string, productName: string) => {
    addToCart(productId);
    toast(`${productName} added to cart!`, {
      action: { label: "View Cart", onClick: () => navigate("/shop/cart") },
    });
  };

  return (
    <div className="mb-6">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 card-elevated">
        <div className="flex items-center gap-2 mb-3">
          <Sun className="w-6 h-6 text-white" />
          <h2 className="text-white text-lg font-bold">{greeting} from Stery! ☀️</h2>
        </div>
        <p className="text-white/90 text-sm mb-4">Today's Fresh Deals — while stocks last!</p>

        <div className="space-y-2">
          {dealProducts.map((product) => (
            <div key={product.id} className="bg-white/95 rounded-xl p-3 flex items-center gap-3">
              <img
                src={product.image}
                alt={product.name}
                className="w-14 h-14 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Clock className="w-3 h-3 text-accent" />
                  <span className="text-[10px] font-semibold text-accent uppercase">Today's Deal</span>
                </div>
                <h3 className="font-semibold text-sm text-foreground truncate">{product.name}</h3>
                <p className="text-primary font-bold text-sm">KSh {product.price}</p>
              </div>
              <Button
                size="sm"
                onClick={() => handleQuickAdd(product.id, product.name)}
                className="bg-primary hover:bg-primary/90 h-9 px-3"
              >
                <ShoppingCart className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        <Link to="/shop/categories" className="mt-3 flex items-center justify-center gap-1 text-white text-sm font-medium">
          <span>View all products</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
