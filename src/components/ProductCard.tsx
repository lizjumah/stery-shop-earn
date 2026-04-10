import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Product } from "@/data/products";
import { AgeGateModal } from "@/components/AgeGateModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Share2, Clock, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isTodayDeal } from "@/data/dailyDeals";

interface ProductCardProps {
  product: Product;
  showDealBadge?: boolean;
}

export const ProductCard = ({ product, showDealBadge = true }: ProductCardProps) => {
  const { mode, addToCart, cart } = useApp();
  const navigate = useNavigate();
  const isEarnMode = mode === "earn";
  const isDeal = showDealBadge && isTodayDeal(product.id);
  const outOfStock =
    product.stockStatus === "out_of_stock" ||
    product.inStock === false ||
    (product.stockQuantity !== undefined && product.stockQuantity <= 0);
  const isLowStock = !outOfStock && product.stockStatus === "low_stock";

  // Still needed for atStockLimit check
  const cartQty = cart.find((i) => i.productId === product.id)?.quantity ?? 0;
  const atStockLimit =
    !isEarnMode && product.stockQuantity !== undefined && cartQty >= product.stockQuantity;

  const [showAgeGate, setShowAgeGate] = useState(false);
  // Brief "Added ✓" feedback state — reverts after 1.5 s
  const [added, setAdded] = useState(false);

  const doAddToCart = () => {
    addToCart(product.id);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
    toast("Item added to cart.", {
      action: { label: "View Cart", onClick: () => navigate("/shop/cart") },
      cancel: { label: "Continue Shopping", onClick: () => {} },
    });
  };

  const handleAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isEarnMode) {
      window.location.href = `/earn/share/${product.id}`;
      return;
    }
    if (outOfStock) {
      toast.error("This item is currently out of stock.");
      return;
    }
    if (atStockLimit) {
      toast.error(`Only ${product.stockQuantity} available — you already have ${cartQty} in your cart.`);
      return;
    }
    if (product.isAgeRestricted && sessionStorage.getItem("stery_age_confirmed") !== "true") {
      setShowAgeGate(true);
      return;
    }
    doAddToCart();
  };

  const handleAgeConfirm = () => {
    sessionStorage.setItem("stery_age_confirmed", "true");
    setShowAgeGate(false);
    doAddToCart();
  };

  const handleAgeExit = () => {
    setShowAgeGate(false);
    navigate("/shop");
  };

  return (
    <>
    <Link to={isEarnMode ? `/earn/product/${product.id}` : `/shop/product/${product.id}`} className="h-full">
      <div className="flex flex-col h-full bg-card rounded-lg overflow-hidden card-elevated animate-fade-in">

        {/* Image — fixed aspect ratio, never grows */}
        <div className="relative aspect-[3/2] overflow-hidden shrink-0">
          <img src={product.image} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
          {isDeal && (
            <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Today's Deal
            </Badge>
          )}
          {!isDeal && product.isOffer && (
            <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground">
              SALE
            </Badge>
          )}
          {isEarnMode && product.commission && (
            <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground">
              Earn KSh {product.commission}
            </Badge>
          )}
        </div>

        {/* Content — grows to fill remaining card height */}
        <div className="flex flex-col flex-1 px-2.5 pt-1.5 pb-2">
          <h3 className="font-semibold text-sm line-clamp-2 text-foreground">{product.name}</h3>

          <p className="text-xs text-muted-foreground mt-0.5">
            {outOfStock ? (
              <span className="text-destructive font-medium">Out of stock</span>
            ) : isLowStock ? (
              <span className="text-amber-600 font-medium">Low stock</span>
            ) : product.stockQuantity !== undefined && product.stockQuantity <= 5 ? (
              <span className="text-amber-600 font-medium">Only {product.stockQuantity} left</span>
            ) : (
              <span className="text-green-600 font-medium">Available today</span>
            )}
          </p>

          {/* Price + action — pinned to bottom of content area */}
          <div className="flex items-center justify-between mt-auto pt-1.5">
            <div>
              <span className="font-bold text-sm text-foreground">KSh {product.price}</span>
              {product.originalPrice && (
                <span className="text-xs text-muted-foreground line-through ml-1">
                  KSh {product.originalPrice}
                </span>
              )}
            </div>

            {isEarnMode ? (
              <Button
                size="icon"
                className="h-8 w-8 rounded-full bg-accent hover:bg-accent/90"
                onClick={handleAction}
              >
                <Share2 className="w-3.5 h-3.5" />
              </Button>
            ) : outOfStock ? (
              <button
                disabled
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                className="h-7 px-2 rounded-md text-[11px] font-medium bg-muted text-muted-foreground cursor-not-allowed"
              >
                Out of stock
              </button>
            ) : (
              <button
                onClick={handleAction}
                className={cn(
                  "h-7 px-2.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1",
                  added
                    ? "bg-green-100 text-green-700"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {added ? (
                  "✓ Added"
                ) : (
                  <>
                    <ShoppingCart className="w-3 h-3" />
                    Add
                  </>
                )}
              </button>
            )}
          </div>

          {!isEarnMode && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              +{Math.floor(product.price / 100)} pts
            </p>
          )}
        </div>
      </div>
    </Link>
    {showAgeGate && (
      <AgeGateModal onConfirm={handleAgeConfirm} onExit={handleAgeExit} />
    )}
    </>
  );
};
