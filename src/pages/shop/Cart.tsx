import { useApp } from "@/contexts/AppContext";
import { useProducts } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag, Truck, Store, Star, Share2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

const DELIVERY_AREAS = [
  { name: "Bungoma Town", fee: 100 },
  { name: "Kanduyi", fee: 200 },
  { name: "Naitiri", fee: 200 },
  { name: "Chwele", fee: 200 },
];
const FREE_DELIVERY_THRESHOLD = 3000;

const BASKET_MILESTONES = [
  { threshold: 3000, label: "FREE delivery" },
];

const Cart = () => {
  const { cart, updateCartQuantity, removeFromCart, generateCartShareCode } = useApp();
  const navigate = useNavigate();
  const [deliveryOption, setDeliveryOption] = useState<"delivery" | "pickup">("delivery");
  const [deliveryArea, setDeliveryArea] = useState(DELIVERY_AREAS[0].name);
  const { data: liveProducts = [] } = useProducts();

  const cartProducts = cart.map((item) => {
    const product = liveProducts.find((p) => p.id === item.productId);
    return { ...item, product };
  }).filter((item) => item.product);

  const subtotal = cartProducts.reduce((sum, item) => sum + (item.product!.price * item.quantity), 0);
  const selectedArea = DELIVERY_AREAS.find((a) => a.name === deliveryArea);
  const rawDeliveryFee = deliveryOption === "delivery" ? (selectedArea?.fee ?? 100) : 0;
  const freeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD && deliveryOption === "delivery";
  const deliveryFee = freeDelivery ? 0 : rawDeliveryFee;
  const total = subtotal + deliveryFee;

  const nextMilestone = BASKET_MILESTONES.find((m) => subtotal < m.threshold);

  const handleShareCart = () => {
    const code = generateCartShareCode();
    const shareUrl = `${window.location.origin}/shop/group-order?cart=${code}`;
    const itemsList = cartProducts.map((i) => `• ${i.product!.name} × ${i.quantity}`).join("\n");
    const message = [
      `Hi 😊 I'm placing an order from Stery.`,
      ``,
      `🛒 My cart:`,
      itemsList,
      ``,
      `💰 Total: KSh ${subtotal}`,
      ``,
      `Want to add something before I checkout?`,
      ``,
      `Join the order here:`,
      shareUrl,
    ].join("\n");

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
    toast.success("Cart shared on WhatsApp!");
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-20 flex flex-col items-center justify-center px-6">
        <div className="bg-secondary rounded-full p-6 mb-4">
          <ShoppingBag className="w-12 h-12 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground text-sm text-center mb-6">Start shopping to add items.</p>
        <Link to="/shop">
          <Button className="bg-primary hover:bg-primary/90">Start Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-40">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-foreground">My Cart ({cart.length})</h1>
          <button
            onClick={handleShareCart}
            className="flex items-center gap-1.5 bg-accent/10 border border-accent/30 rounded-full px-3 py-1.5 transition-colors hover:bg-accent/20"
          >
            <Share2 className="w-4 h-4 text-accent" />
            <span className="text-xs font-semibold text-accent">Share Cart</span>
          </button>
        </div>

        {/* Cart Items */}
        <div className="space-y-3 mb-6">
          {cartProducts.map(({ productId, quantity, product }) => (
            <div key={productId} className="bg-card rounded-xl p-3 flex gap-3 card-elevated">
              <img src={product!.image} alt={product!.name} className="w-20 h-20 rounded-lg object-cover" />
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-foreground">{product!.name}</h3>
                <p className="text-primary font-bold mt-1">KSh {product!.price}</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateCartQuantity(productId, quantity - 1)} className="w-7 h-7 rounded-full border border-border flex items-center justify-center">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold text-sm w-6 text-center">{quantity}</span>
                    <button
                      onClick={() => {
                        const maxQty = product!.stockQuantity ?? Infinity;
                        if (quantity >= maxQty) {
                          toast.error(`Only ${maxQty} available`);
                          return;
                        }
                        updateCartQuantity(productId, quantity + 1);
                      }}
                      disabled={product!.stockQuantity !== undefined && quantity >= product!.stockQuantity}
                      className="w-7 h-7 rounded-full border border-border flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
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

        {/* Basket Unlock Bonus */}
        <div className="bg-card rounded-xl p-4 card-elevated mb-4 border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-5 h-5 text-primary fill-primary" />
            <h2 className="font-semibold text-foreground text-sm">Basket Unlock Bonuses</h2>
          </div>
          <div className="space-y-2">
            {BASKET_MILESTONES.map((m) => {
              const unlocked = subtotal >= m.threshold;
              return (
                <div key={m.threshold} className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${unlocked ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}>
                    {unlocked ? "✓" : ""}
                  </div>
                  <span className={`text-sm ${unlocked ? "text-accent font-medium line-through" : "text-foreground"}`}>
                    Spend KSh {m.threshold.toLocaleString()} → {m.label}
                  </span>

                </div>
              );
            })}
          </div>
          {nextMilestone && (
            <div className="mt-3 bg-primary/5 rounded-lg p-2.5">
              <p className="text-sm text-primary font-medium">
                🎯 Add KSh {(nextMilestone.threshold - subtotal).toLocaleString()} more to {nextMilestone.threshold === 3000 ? "unlock" : "earn"} {nextMilestone.label}!
              </p>
            </div>
          )}
        </div>

        {/* Smart progress messages */}
        {subtotal > 0 && subtotal < 3000 && deliveryOption === "delivery" && (
          <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 mb-4">
            <p className="text-sm text-accent font-medium">
              🚚 Add KSh {(3000 - subtotal).toLocaleString()} more to unlock <strong>FREE delivery</strong>!
            </p>
          </div>
        )}
        {subtotal > 0 && subtotal < 1000 && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-4">
            <p className="text-sm text-primary font-medium">
              ⭐ Add KSh {(1000 - subtotal).toLocaleString()} more to earn <strong>bonus loyalty points</strong>!
            </p>
          </div>
        )}

        {/* Delivery Option */}
        <h2 className="font-semibold text-foreground mb-3">Delivery Option</h2>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button onClick={() => setDeliveryOption("pickup")} className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center ${deliveryOption === "pickup" ? "border-primary bg-primary/5" : "border-border"}`}>
            <Store className={`w-5 h-5 mb-1 ${deliveryOption === "pickup" ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`text-sm font-medium ${deliveryOption === "pickup" ? "text-primary" : "text-foreground"}`}>Pickup</span>
            <span className="text-xs text-muted-foreground">Free</span>
          </button>
          <button onClick={() => setDeliveryOption("delivery")} className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center ${deliveryOption === "delivery" ? "border-primary bg-primary/5" : "border-border"}`}>
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
                  <button key={area.name} onClick={() => setDeliveryArea(area.name)} className={`p-2.5 rounded-lg border-2 text-left transition-colors ${deliveryArea === area.name ? "border-primary bg-primary/5" : "border-border"}`}>
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

        <div className="bg-primary/10 rounded-lg p-3 mb-4">
          <p className="text-primary text-sm font-semibold">🎁 You'll earn {Math.floor(subtotal / 100)} loyalty points from this order!</p>
        </div>
      </div>

      {/* Fixed Bottom */}
      <div className="fixed bottom-16 left-0 right-0 bg-card border-t border-border p-4 z-40">
        <div className="flex justify-between text-sm text-muted-foreground mb-1">
          <span>Subtotal</span><span>KSh {subtotal}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Delivery{deliveryOption === "delivery" ? ` (${deliveryArea})` : ""}</span>
          <span>{deliveryOption === "pickup" ? "Free" : freeDelivery ? <span className="text-accent font-medium">Free</span> : `KSh ${deliveryFee}`}</span>
        </div>
        <div className="flex justify-between font-bold text-foreground text-lg mb-3">
          <span>Total</span><span>KSh {total}</span>
        </div>
        <Button onClick={() => navigate(`/shop/checkout?delivery=${deliveryOption}&area=${encodeURIComponent(deliveryArea)}`)} className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90">
          Proceed to Checkout
        </Button>
      </div>
    </div>
  );
};

export default Cart;
