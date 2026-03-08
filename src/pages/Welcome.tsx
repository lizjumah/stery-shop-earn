import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { ShoppingBag, TrendingUp, Truck, Gift, Users, ShoppingCart } from "lucide-react";
import { products } from "@/data/products";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const FEATURED_IDS = ["1", "2", "14", "3"]; // Bread, Milk, Eggs, Sugar

const Welcome = () => {
  const navigate = useNavigate();
  const { setMode, addToCart } = useApp();

  const handleChoice = (choice: "shop" | "earn") => {
    setMode(choice);
    navigate("/shop");
  };

  const featuredProducts = FEATURED_IDS
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p && p.inStock);

  const handleQuickAdd = (productId: string, productName: string) => {
    addToCart(productId);
    toast(`${productName} added to cart!`, {
      action: { label: "View Cart", onClick: () => navigate("/shop/cart") },
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center px-6 py-10">
        {/* Logo & Headline */}
        <div className="text-center mb-6 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-shop mb-3">
            <span className="text-2xl font-black text-white">S</span>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            Welcome to Stery
          </h1>
          <p className="text-primary font-semibold text-lg mt-1">
            Shop smart. Earn more.
          </p>
          <p className="text-muted-foreground text-sm mt-2 max-w-[320px] mx-auto leading-relaxed">
            Fresh groceries, daily bakery items, and household essentials delivered locally with easy M-Pesa payments.
          </p>
        </div>

        {/* Choice Cards */}
        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={() => handleChoice("shop")}
            className="w-full gradient-shop rounded-2xl p-6 text-left card-elevated transform transition-transform active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/20 rounded-full p-4">
                <ShoppingBag className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">Shop with Stery</h2>
                <p className="text-white/80 mt-1 text-sm">
                  Browse products, earn points & get rewards
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleChoice("earn")}
            className="w-full gradient-earn rounded-2xl p-5 text-left card-elevated transform transition-transform active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/20 rounded-full p-3">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white">Earn with Stery</h2>
                <p className="text-white/80 mt-0.5 text-sm">
                  Sell products, earn commission & grow income
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Fresh Today Section */}
        <div className="w-full max-w-sm mt-8">
          <h2 className="text-lg font-bold text-foreground mb-3">🛒 Fresh Today</h2>
          <div className="grid grid-cols-2 gap-3">
            {featuredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-card rounded-xl overflow-hidden card-elevated"
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-24 object-cover"
                />
                <div className="p-3 flex flex-col gap-1.5">
                  <h3 className="text-sm font-semibold text-foreground line-clamp-1">{product.name}</h3>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-primary">KSh {product.price}</p>
                    <Button
                      size="icon"
                      className="h-7 w-7 rounded-full bg-primary hover:bg-primary/90"
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

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <div className="flex items-center gap-1.5 bg-card rounded-full px-3 py-1.5 card-elevated">
            <Truck className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">Delivery available</span>
          </div>
          <div className="flex items-center gap-1.5 bg-card rounded-full px-3 py-1.5 card-elevated">
            <Gift className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">Loyalty rewards</span>
          </div>
          <div className="flex items-center gap-1.5 bg-card rounded-full px-3 py-1.5 card-elevated">
            <Users className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-medium text-foreground">Reseller commissions</span>
          </div>
        </div>
      </div>

      <div className="py-6 text-center">
        <p className="text-xs text-muted-foreground">Powered by Stery Kenya 🇰🇪</p>
      </div>
    </div>
  );
};

export default Welcome;
