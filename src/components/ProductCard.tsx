import { Link } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Product } from "@/data/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Share2, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const { mode, addToCart } = useApp();
  const isEarnMode = mode === "earn";

  const handleAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isEarnMode) {
      // Navigate to share
      window.location.href = `/earn/share/${product.id}`;
    } else {
      addToCart(product.id);
    }
  };

  return (
    <Link to={isEarnMode ? `/earn/product/${product.id}` : `/shop/product/${product.id}`}>
      <div className="bg-card rounded-lg overflow-hidden card-elevated animate-fade-in">
        <div className="relative aspect-square">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          {product.isOffer && (
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
          <h3 className="font-semibold text-sm line-clamp-2 text-foreground">
            {product.name}
          </h3>
          
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3 h-3 fill-primary text-primary" />
            <span className="text-xs text-muted-foreground">4.5</span>
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <div>
              <span className="font-bold text-lg text-foreground">
                KSh {product.price}
              </span>
              {product.originalPrice && (
                <span className="text-xs text-muted-foreground line-through ml-1">
                  KSh {product.originalPrice}
                </span>
              )}
            </div>
            
            <Button
              size="icon"
              variant={isEarnMode ? "default" : "default"}
              className={cn(
                "h-9 w-9 rounded-full",
                isEarnMode ? "bg-accent hover:bg-accent/90" : "bg-primary hover:bg-primary/90"
              )}
              onClick={handleAction}
            >
              {isEarnMode ? (
                <Share2 className="w-4 h-4" />
              ) : (
                <ShoppingCart className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          {!isEarnMode && (
            <p className="text-xs text-muted-foreground mt-1">
              +{product.loyaltyPoints} points
            </p>
          )}
        </div>
      </div>
    </Link>
  );
};
