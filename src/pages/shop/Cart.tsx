import { useApp } from "@/contexts/AppContext";
import { useProducts } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag, Star, Share2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

const FREE_DELIVERY_THRESHOLD = 3000;


const Cart = () => {
  const { cart, updateCartQuantity, removeFromCart, generateCartShareCode } = useApp();
  const navigate = useNavigate();
  const { data: liveProducts = [] } = useProducts();

  const cartProducts = cart.map((item) => {
    const product = liveProducts.find((p) => p.id === item.productId);
    return { ...item, product };
  }).filter((item) => item.product);

  const subtotal = cartProducts.reduce((sum, item) => sum + (item.product!.price * item.quantity), 0);

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

        {/* Basket rewards */}
        <div className="bg-card rounded-xl p-4 card-elevated mb-4 border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-5 h-5 text-primary fill-primary" />
            <h2 className="font-semibold text-foreground text-sm">Unlock rewards</h2>
          </div>

          {/* Free delivery milestone */}
          {(() => {
            const unlocked = subtotal >= FREE_DELIVERY_THRESHOLD;
            const remaining = FREE_DELIVERY_THRESHOLD - subtotal;
            const progress = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100);
            return (
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${unlocked ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}>
                    {unlocked ? "✓" : ""}
                  </div>
                  <span className={`text-sm ${unlocked ? "text-accent font-medium line-through" : "text-foreground"}`}>
                    Spend KSh {FREE_DELIVERY_THRESHOLD.toLocaleString()} for FREE delivery
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden ml-7">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {!unlocked && subtotal > 0 && (
                  <p className="text-xs text-muted-foreground mt-1.5 ml-7">
                    Add KSh {remaining.toLocaleString()} more
                  </p>
                )}
                {unlocked && (
                  <p className="text-xs text-accent font-medium mt-1.5 ml-7">
                    🎉 Free delivery unlocked on this order!
                  </p>
                )}
              </div>
            );
          })()}

          {/* Loyalty points */}
          <div className="flex items-center gap-2 pt-3 border-t border-border">
            <span className="text-base">⭐</span>
            <p className="text-sm text-amber-600 font-medium">
              You'll earn {Math.floor(subtotal / 100)} loyalty points from this order
            </p>
          </div>
        </div>
      </div>

      {/* Fixed Bottom */}
      <div className="fixed bottom-16 left-0 right-0 bg-card border-t border-border p-4 z-40">
        <div className="flex justify-between font-bold text-foreground text-lg mb-1">
          <span>Subtotal</span><span>KSh {subtotal}</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Delivery fee calculated at checkout</p>
        <Button onClick={() => navigate("/shop/checkout")} className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90">
          Proceed to Checkout
        </Button>
      </div>
    </div>
  );
};

export default Cart;
