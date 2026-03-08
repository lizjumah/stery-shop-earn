import { useState, useEffect } from "react";
import { products, categories } from "@/data/products";
import { getTodayDeals } from "@/data/dailyDeals";
import { useApp } from "@/contexts/AppContext";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShoppingCart, Clock, Flame, ChevronRight, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const DEAL_CATEGORIES = ["All", "Groceries", "Household", "Baby Items", "Bakery", "Flash Deals"];

const Offers = () => {
  const navigate = useNavigate();
  const { addToCart } = useApp();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [hoursLeft, setHoursLeft] = useState(0);
  const [minutesLeft, setMinutesLeft] = useState(0);

  // Countdown to end of day
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      const diff = endOfDay.getTime() - now.getTime();
      setHoursLeft(Math.floor(diff / (1000 * 60 * 60)));
      setMinutesLeft(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  const offerProducts = products.filter((p) => p.isOffer && p.inStock);
  const todayDealIds = getTodayDeals().map((d) => d.productId);
  const todayDealProducts = todayDealIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p && p.inStock);

  // Featured deal of the day
  const featuredDeal = getTodayDeals().find((d) => d.featured);
  const featuredProduct = featuredDeal ? products.find((p) => p.id === featuredDeal.productId) : offerProducts[0];

  // Filter by category
  const filteredDeals =
    selectedCategory === "All"
      ? offerProducts
      : selectedCategory === "Flash Deals"
      ? todayDealProducts
      : offerProducts.filter((p) => p.category === selectedCategory);

  const handleAdd = (id: string, name: string) => {
    addToCart(id);
    toast.success(`${name} added to cart!`, {
      action: { label: "View Cart", onClick: () => navigate("/shop/cart") },
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-destructive to-orange-500 px-4 pt-6 pb-5 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="bg-white/20 rounded-full p-2">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-white text-xl font-bold">🔥 Hot Deals Today</h1>
            <p className="text-white/80 text-xs">Limited-time offers just for you</p>
          </div>
          <div className="bg-white/20 rounded-xl px-3 py-2 text-center">
            <div className="flex items-center gap-1 text-white">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-sm font-bold">{hoursLeft}h {minutesLeft}m</span>
            </div>
            <p className="text-[9px] text-white/70">left today</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-5 space-y-5">
        {/* Deal of the Day - Featured */}
        {featuredProduct && (
          <div className="bg-card rounded-2xl overflow-hidden card-elevated border-2 border-destructive/30">
            <div className="bg-destructive/5 px-4 py-2 flex items-center gap-2">
              <Flame className="w-4 h-4 text-destructive" />
              <span className="font-bold text-destructive text-sm">Deal of the Day</span>
              <Badge className="ml-auto bg-destructive text-destructive-foreground text-[10px]">
                TODAY ONLY
              </Badge>
            </div>
            <div className="p-4 flex gap-4">
              <img
                src={featuredProduct.image}
                alt={featuredProduct.name}
                className="w-28 h-28 rounded-xl object-cover shrink-0"
              />
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-foreground text-lg">{featuredProduct.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{featuredProduct.description}</p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xl font-bold text-primary">KSh {featuredProduct.price}</span>
                  {featuredProduct.originalPrice && (
                    <span className="text-sm text-muted-foreground line-through">KSh {featuredProduct.originalPrice}</span>
                  )}
                </div>
                {featuredProduct.originalPrice && (
                  <Badge className="bg-destructive/10 text-destructive border-0 w-fit text-xs mt-1">
                    {Math.round(((featuredProduct.originalPrice - featuredProduct.price) / featuredProduct.originalPrice) * 100)}% OFF
                  </Badge>
                )}
              </div>
            </div>
            <div className="px-4 pb-4">
              <Button
                className="w-full bg-destructive hover:bg-destructive/90 h-11 font-semibold"
                onClick={() => handleAdd(featuredProduct.id, featuredProduct.name)}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Shop This Deal
              </Button>
            </div>
          </div>
        )}

        {/* Deal Categories - Horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
          {DEAL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors shrink-0 ${
                selectedCategory === cat
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-muted text-foreground border border-border"
              }`}
            >
              {cat === "Flash Deals" && <Zap className="w-3.5 h-3.5 inline mr-1" />}
              {cat}
            </button>
          ))}
        </div>

        {/* Deal Cards */}
        <div>
          <h2 className="font-bold text-foreground mb-3">
            {selectedCategory === "All" ? "All Deals" : selectedCategory} ({filteredDeals.length})
          </h2>
          <div className="space-y-3">
            {filteredDeals.map((product) => {
              const discount = product.originalPrice
                ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
                : 0;
              const isTodayDeal = todayDealIds.includes(product.id);

              return (
                <div
                  key={product.id}
                  className="bg-card rounded-xl p-3 flex gap-3 card-elevated border border-border"
                  onClick={() => navigate(`/shop/product/${product.id}`)}
                >
                  <div className="relative shrink-0">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-24 h-24 rounded-xl object-cover"
                    />
                    {discount > 0 && (
                      <Badge className="absolute -top-1.5 -left-1.5 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5">
                        {discount}% OFF
                      </Badge>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground text-sm truncate">{product.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{product.category}</p>
                      {isTodayDeal && (
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3 text-destructive" />
                          <span className="text-[10px] font-semibold text-destructive">
                            Ends in {hoursLeft}h {minutesLeft}m
                          </span>
                        </div>
                      )}
                      {!isTodayDeal && (
                        <Badge variant="outline" className="mt-1 text-[10px] border-accent text-accent">
                          Today Only
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">KSh {product.price}</span>
                        {product.originalPrice && (
                          <span className="text-xs text-muted-foreground line-through">KSh {product.originalPrice}</span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 h-8 px-3 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdd(product.id, product.name);
                        }}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredDeals.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">No deals in this category right now.</p>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Offers;
