import { Link, useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Product } from "@/data/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Share2, Clock } from "lucide-react";
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
  const outOfStock = product.inStock === false || (product.stockQuantity !== undefined && product.stockQuantity <= 0);

  // How many of this product are already in the cart
  const cartQty = cart.find((i) => i.productId === product.id)?.quantity ?? 0;
  const atStockLimit = !isEarnMode && product.stockQuantity !== undefined && cartQty >= product.stockQuantity;

  const handleAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isEarnMode) {
      window.location.href = `/earn/share/${product.id}`;
    } else {
      if (outOfStock) {
        toast.error("This item is currently out of stock.");
        return;
      }
      if (atStockLimit) {
        toast.error(`Only ${product.stockQuantity} available — you already have ${cartQty} in your cart.`);
        return;
      }
      addToCart(product.id);
      toast("Item added to cart.", {
        action: { label: "View Cart", onClick: () => navigate("/shop/cart") },
        cancel: { label: "Continue Shopping", onClick: () => {} },
      });
    }
  };

  return (
    <Link to={isEarnMode ? `/earn/product/${product.id}` : `/shop/product/${product.id}`}>
      <div className="bg-card rounded-lg overflow-hidden card-elevated animate-fade-in">
        <div className="relative aspect-square">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
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
        
        <div className="p-3">
          <h3 className="font-semibold text-sm line-clamp-2 text-foreground">{product.name}</h3>
          
          <p className="text-xs text-muted-foreground mt-1">
            {outOfStock ? (
              <span className="text-destructive font-medium">Out of Stock</span>
            ) : product.stockQuantity !== undefined && product.stockQuantity <= 5 ? (
              <span className="text-amber-500 font-medium">Only {product.stockQuantity} left</span>
            ) : (
              <span className="text-accent font-medium">In Stock</span>
            )}
          </p>
          
          <div className="flex items-center justify-between mt-2">
            <div>
              <span className="font-bold text-lg text-foreground">KSh {product.price}</span>
              {product.originalPrice && (
                <span className="text-xs text-muted-foreground line-through ml-1">KSh {product.originalPrice}</span>
              )}
            </div>
            
            <Button
              size="icon"
              disabled={!isEarnMode && (outOfStock || atStockLimit)}
              className={cn("h-9 w-9 rounded-full", isEarnMode ? "bg-accent hover:bg-accent/90" : "bg-primary hover:bg-primary/90")}
              onClick={handleAction}
            >
              {isEarnMode ? <Share2 className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
            </Button>
          </div>
          
          {!isEarnMode && (
            <p className="text-xs text-muted-foreground mt-1">+{product.loyaltyPoints} points</p>
          )}
        </div>
      </div>
    </Link>
  );
};
