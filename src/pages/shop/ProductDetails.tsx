import { useParams, useNavigate, Link } from "react-router-dom";
import { products } from "@/data/products";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, ShoppingCart, Truck, Store, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useApp();
  const [quantity, setQuantity] = useState(1);
  const [deliveryOption, setDeliveryOption] = useState<"delivery" | "pickup">("delivery");

  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Product not found</p>
      </div>
    );
  }

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart(product.id);
    }
    toast.success(`${quantity} x ${product.name} added to cart!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 bg-card/80 backdrop-blur rounded-full p-2"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <img
          src={product.image}
          alt={product.name}
          className="w-full aspect-square object-cover"
        />
        {product.isOffer && (
          <Badge className="absolute top-4 right-4 bg-destructive text-destructive-foreground text-lg px-3 py-1">
            SALE
          </Badge>
        )}
      </div>

      <div className="px-4 py-6">
        <div className="flex items-start justify-between mb-2">
          <div>
            <Badge variant="secondary" className="mb-2">{product.category}</Badge>
            <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
          </div>
          <div className="flex items-center gap-1 bg-secondary rounded-full px-2 py-1">
            <Star className="w-4 h-4 fill-primary text-primary" />
            <span className="text-sm font-medium">4.5</span>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl font-bold text-foreground">
            KSh {product.price}
          </span>
          {product.originalPrice && (
            <span className="text-lg text-muted-foreground line-through">
              KSh {product.originalPrice}
            </span>
          )}
        </div>

        <p className="text-muted-foreground mb-6">{product.description}</p>

        {/* Loyalty Points */}
        <div className="bg-primary/10 rounded-lg p-4 mb-6">
          <p className="text-primary font-semibold">
            🎁 Earn {product.loyaltyPoints * quantity} loyalty points with this purchase!
          </p>
        </div>

        {/* Quantity */}
        <div className="flex items-center justify-between mb-6">
          <span className="font-medium text-foreground">Quantity</span>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="h-10 w-10 rounded-full"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-xl font-bold w-8 text-center">{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(quantity + 1)}
              className="h-10 w-10 rounded-full"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Delivery Options */}
        <div className="mb-6">
          <span className="font-medium text-foreground block mb-3">Delivery Option</span>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setDeliveryOption("delivery")}
              className={`p-4 rounded-xl border-2 transition-all ${
                deliveryOption === "delivery"
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              <Truck className={`w-6 h-6 mx-auto mb-2 ${deliveryOption === "delivery" ? "text-primary" : "text-muted-foreground"}`} />
              <p className={`font-medium ${deliveryOption === "delivery" ? "text-primary" : "text-foreground"}`}>
                Delivery
              </p>
              <p className="text-xs text-muted-foreground">KSh 100</p>
            </button>
            <button
              onClick={() => setDeliveryOption("pickup")}
              className={`p-4 rounded-xl border-2 transition-all ${
                deliveryOption === "pickup"
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              <Store className={`w-6 h-6 mx-auto mb-2 ${deliveryOption === "pickup" ? "text-primary" : "text-muted-foreground"}`} />
              <p className={`font-medium ${deliveryOption === "pickup" ? "text-primary" : "text-foreground"}`}>
                Pickup
              </p>
              <p className="text-xs text-muted-foreground">Free</p>
            </button>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
        <Button
          onClick={handleAddToCart}
          className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90"
        >
          <ShoppingCart className="w-5 h-5 mr-2" />
          Add to Cart - KSh {product.price * quantity}
        </Button>
      </div>
    </div>
  );
};

export default ProductDetails;
