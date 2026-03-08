import { useApp } from "@/contexts/AppContext";
import { products } from "@/data/products";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag, Truck, Store } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

const DELIVERY_AREAS = [
  { name: "Bungoma Town", fee: 100 },
  { name: "Kanduyi", fee: 200 },
  { name: "Naitiri", fee: 200 },
  { name: "Chwele", fee: 200 },
];
const FREE_DELIVERY_THRESHOLD = 3000;

const Cart = () => {
  const { cart, updateCartQuantity, removeFromCart } = useApp();
  const navigate = useNavigate();
  const [deliveryOption, setDeliveryOption] = useState<"delivery" | "pickup">("delivery");
  const [deliveryArea, setDeliveryArea] = useState(DELIVERY_AREAS[0].name);

  const cartProducts = cart.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    return { ...item, product };
  }).filter((item) => item.product);

  const subtotal = cartProducts.reduce((sum, item) => sum + (item.product!.price * item.quantity), 0);
  const selectedArea = DELIVERY_AREAS.find((a) => a.name === deliveryArea);
  const rawDeliveryFee = deliveryOption === "delivery" ? (selectedArea?.fee ?? 100) : 0;
  const freeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD && deliveryOption === "delivery";
  const deliveryFee = freeDelivery ? 0 : rawDeliveryFee;
  const total = subtotal + deliveryFee;
  const totalPoints = cartProducts.reduce((sum, item) => sum + (item.product!.loyaltyPoints * item.quantity), 0);

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-20 flex flex-col items-center justify-center px-6">
        <div className="bg-secondary rounded-full p-6 mb-4">
          <ShoppingBag className="w-12 h-12 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground text-sm text-center mb-6">Browse products and add items to get started</p>
        <Link to="/shop">
          <Button className="bg-primary hover:bg-primary/90">Continue Shopping</Button>
        </Link>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-40">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-foreground mb-4">My Cart ({cart.length})</h1>

        {/* Cart Items */}
        <div className="space-y-3 mb-6">
          {cartProducts.map(({ productId, quantity, product }) => (
            <div key={productId} className="bg-card rounded-xl p-3 flex gap-3 card-elevated">
              <img
                src={product!.image}
                alt={product!.name}
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-foreground">{product!.name}</h3>
                <p className="text-primary font-bold mt-1">KSh {product!.price}</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCartQuantity(productId, quantity - 1)}
                      className="w-7 h-7 rounded-full border border-border flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold text-sm w-6 text-center">{quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(productId, quantity + 1)}
                      className="w-7 h-7 rounded-full border border-border flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <button onClick={() => removeFromCart(productId)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="font-bold text-foreground text-sm">KSh {product!.price * quantity}</p>
            </div>
          ))}
        </div>

        {/* Delivery Option */}
        <h2 className="font-semibold text-foreground mb-3">Delivery Option</h2>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => setDeliveryOption("pickup")}
            className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center ${
              deliveryOption === "pickup" ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <Store className={`w-5 h-5 mb-1 ${deliveryOption === "pickup" ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`text-sm font-medium ${deliveryOption === "pickup" ? "text-primary" : "text-foreground"}`}>Pickup</span>
            <span className="text-xs text-muted-foreground">Free</span>
          </button>
          <button
            onClick={() => setDeliveryOption("delivery")}
            className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center ${
              deliveryOption === "delivery" ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <Truck className={`w-5 h-5 mb-1 ${deliveryOption === "delivery" ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`text-sm font-medium ${deliveryOption === "delivery" ? "text-primary" : "text-foreground"}`}>Delivery</span>
            <span className="text-xs text-muted-foreground">From KSh 100</span>
          </button>
        </div>

        {deliveryOption === "delivery" && (
          <div className="space-y-3 mb-6">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Delivery Area</label>
              <div className="grid grid-cols-2 gap-2">
                {DELIVERY_AREAS.map((area) => (
                  <button
                    key={area.name}
                    onClick={() => setDeliveryArea(area.name)}
                    className={`p-2.5 rounded-lg border-2 text-left transition-colors ${
                      deliveryArea === area.name ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <p className={`text-sm font-medium ${deliveryArea === area.name ? "text-primary" : "text-foreground"}`}>{area.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {subtotal >= FREE_DELIVERY_THRESHOLD ? <span className="text-accent font-medium">Free</span> : `KSh ${area.fee}`}
                    </p>
                  </button>
                ))}
              </div>
            </div>
            {subtotal >= FREE_DELIVERY_THRESHOLD && (
              <div className="bg-accent/10 rounded-lg p-2.5 text-center">
                <p className="text-accent text-sm font-semibold">🎉 Free delivery on orders above KSh {FREE_DELIVERY_THRESHOLD.toLocaleString()}!</p>
              </div>
            )}
          </div>
        )}

        {deliveryOption === "pickup" && <div className="mb-6" />}

        {/* Points */}
        <div className="bg-primary/10 rounded-lg p-3 mb-4">
          <p className="text-primary text-sm font-semibold">🎁 You'll earn {totalPoints} loyalty points!</p>
        </div>
      </div>

      {/* Fixed Bottom */}
      <div className="fixed bottom-16 left-0 right-0 bg-card border-t border-border p-4 z-40">
        <div className="flex justify-between text-sm text-muted-foreground mb-1">
          <span>Subtotal</span><span>KSh {subtotal}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Delivery{deliveryOption === "delivery" ? ` (${deliveryArea})` : ""}</span>
          <span>
            {deliveryOption === "pickup" ? "Free" : freeDelivery ? (
              <span className="text-accent font-medium">Free</span>
            ) : `KSh ${deliveryFee}`}
          </span>
        </div>
        <div className="flex justify-between font-bold text-foreground text-lg mb-3">
          <span>Total</span><span>KSh {total}</span>
        </div>
        <Button
          onClick={() => navigate(`/shop/checkout?delivery=${deliveryOption}&area=${encodeURIComponent(deliveryArea)}`)}
          className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90"
        >
          Proceed to Checkout
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Cart;
