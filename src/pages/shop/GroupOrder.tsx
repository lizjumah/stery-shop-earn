import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useProducts } from "@/hooks/useProducts";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Check, Users, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const GroupOrder = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loadSharedCart, cart, addToCart, cartItemCount, mode, setMode } = useApp();
  const [loaded, setLoaded] = useState(false);
  const [sharedItems, setSharedItems] = useState<{ productId: string; quantity: number }[]>([]);

  const { data: liveProducts = [] } = useProducts();
  const cartCode = searchParams.get("cart");

  useEffect(() => {
    if (cartCode && !loaded) {
      // Decode the shared cart to display it
      try {
        const data = atob(cartCode);
        const items = data.split(",").map((item) => {
          const [productId, qty] = item.split(":");
          return { productId, quantity: parseInt(qty, 10) };
        }).filter((i) => i.productId && !isNaN(i.quantity));
        setSharedItems(items);
      } catch {
        setSharedItems([]);
      }
      setLoaded(true);
    }
  }, [cartCode, loaded]);

  const sharedProducts = sharedItems.map((item) => {
    const product = liveProducts.find((p) => p.id === item.productId);
    return { ...item, product };
  }).filter((i) => i.product);

  const sharedTotal = sharedProducts.reduce((sum, i) => sum + (i.product!.price * i.quantity), 0);

  const handleJoinOrder = () => {
    if (!mode) setMode("shop");
    if (cartCode) {
      loadSharedCart(cartCode);
      toast.success("Items added to your cart! You've joined the group order.");
      navigate("/shop/cart");
    }
  };

  const suggestedProducts = liveProducts.filter(
    (p) => !sharedItems.find((s) => s.productId === p.id)
  ).slice(0, 6);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="gradient-shop px-4 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="bg-white/20 rounded-full p-2">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-white text-xl font-bold">Group Order</h1>
            <p className="text-white/80 text-sm">Someone shared their Stery cart with you</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 card-elevated">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-accent/10 rounded-full p-3">
              <Users className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="font-bold text-foreground">Shared Cart</p>
              <p className="text-xs text-muted-foreground">{sharedProducts.length} item{sharedProducts.length !== 1 ? "s" : ""} · KSh {sharedTotal.toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-2">
            {sharedProducts.map(({ productId, quantity, product }) => (
              <div key={productId} className="flex items-center gap-3 bg-secondary rounded-lg p-2.5">
                <img src={product!.image} alt={product!.name} className="w-12 h-12 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{product!.name}</p>
                  <p className="text-xs text-muted-foreground">× {quantity} · KSh {product!.price * quantity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 mt-6">
        {/* Add your own items */}
        <h2 className="text-lg font-bold text-foreground mb-3">Add your items to the order</h2>
        <p className="text-sm text-muted-foreground mb-4">Browse and add items before joining the group order.</p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {suggestedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>

      {/* Fixed Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-40">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-muted-foreground">Shared cart total</p>
            <p className="text-lg font-bold text-foreground">KSh {sharedTotal.toLocaleString()}</p>
          </div>
          {cartItemCount > 0 && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Your additions</p>
              <p className="text-sm font-semibold text-primary">{cartItemCount} item{cartItemCount !== 1 ? "s" : ""}</p>
            </div>
          )}
        </div>
        <Button onClick={handleJoinOrder} className="w-full h-14 text-lg font-semibold bg-accent hover:bg-accent/90 text-accent-foreground">
          <Users className="w-5 h-5 mr-2" />
          Join Group Order
        </Button>
      </div>
    </div>
  );
};

export default GroupOrder;
