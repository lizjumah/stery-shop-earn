import { useParams, useNavigate, Link } from "react-router-dom";
import { useProduct } from "@/hooks/useProducts";
import { useProductImages } from "@/hooks/useProductImages";
import { FrequentlyBoughtTogether } from "@/components/shop/FrequentlyBoughtTogether";
import { CustomersAlsoBuy } from "@/components/shop/CustomersAlsoBuy";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, ShoppingCart, Minus, Plus, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, cartItemCount, cart } = useApp();
  const [quantity, setQuantity] = useState(1);
  const { product, isLoading } = useProduct(id);
  const { data: galleryImages = [] } = useProductImages(id);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Product not found</p>
      </div>
    );
  }

  // How many of this product are already in the cart
  const cartQty = cart.find((i) => i.productId === product.id)?.quantity ?? 0;
  const stockLimit = product.stockQuantity ?? Infinity;
  // How many MORE the customer can add
  const maxAddable = Math.max(0, stockLimit === Infinity ? Infinity : stockLimit - cartQty);

  const handleAddToCart = () => {
    if (maxAddable === 0) {
      toast.error(
        cartQty > 0
          ? `You already have all ${stockLimit} available in your cart.`
          : `"${product.name}" is out of stock.`
      );
      return;
    }
    const addQty = Math.min(quantity, maxAddable);
    for (let i = 0; i < addQty; i++) {
      addToCart(product.id);
    }
    toast("Item added to cart.", {
      action: { label: "View Cart", onClick: () => navigate("/shop/cart") },
      cancel: { label: "Continue Shopping", onClick: () => {} },
    });
  };

  const handleShareWhatsApp = () => {
    const productUrl = `${window.location.origin}/shop/product/${product.id}`;
    const message = [
      `${product.name} available on Stery! ${product.category === "Bakery" ? "🍞" : "🛒"}`,
      ``,
      `💰 KSh ${product.price}${product.originalPrice ? ` (was KSh ${product.originalPrice})` : ""}`,
      ``,
      product.description,
      ``,
      `Order from Stery here:`,
      productUrl,
    ].join("\n");

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-background pb-32 max-w-lg mx-auto">
      {/* Header — product image with nav buttons overlaid */}
      <div className="relative bg-muted">
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 z-10 bg-card/80 backdrop-blur rounded-full p-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <button onClick={handleShareWhatsApp} className="bg-card/80 backdrop-blur rounded-full p-2">
            <Share2 className="w-6 h-6 text-accent" />
          </button>
          <Link to="/shop/cart" className="bg-card/80 backdrop-blur rounded-full p-2 relative">
            <ShoppingCart className="w-6 h-6" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </Link>
        </div>
        {/* Main image — shows selected thumbnail or the product cover */}
        <img
          src={activeImage ?? product.image}
          alt={product.name}
          className="w-full max-h-56 object-contain"
        />
        {product.isOffer && (
          <Badge className="absolute top-4 right-24 bg-destructive text-destructive-foreground text-lg px-3 py-1">
            SALE
          </Badge>
        )}
      </div>

      {/* Gallery thumbnails — only rendered when extra images exist */}
      {galleryImages.length > 0 && (
        <div className="flex gap-2 px-4 pt-3 pb-1 overflow-x-auto scrollbar-hide">
          {/* Cover image thumb */}
          <button
            onClick={() => setActiveImage(null)}
            className={`shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-colors ${
              activeImage === null ? "border-primary" : "border-border"
            }`}
          >
            <img src={product.image} alt="Cover" className="w-full h-full object-cover" />
          </button>
          {/* Extra gallery thumbs */}
          {galleryImages.map((img) => (
            <button
              key={img.id}
              onClick={() => setActiveImage(img.image_url)}
              className={`shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-colors ${
                activeImage === img.image_url ? "border-primary" : "border-border"
              }`}
            >
              <img src={img.image_url} alt="Gallery" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="px-4 pt-5 pb-4">
        {/* Name + rating */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <Badge variant="secondary" className="mb-2">{product.category}</Badge>
            <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
          </div>
          <div className="flex items-center gap-1 bg-secondary rounded-full px-2 py-1 shrink-0 ml-2">
            <Star className="w-4 h-4 fill-primary text-primary" />
            <span className="text-sm font-medium">4.5</span>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl font-bold text-foreground">KSh {product.price}</span>
          {product.originalPrice && (
            <span className="text-lg text-muted-foreground line-through">KSh {product.originalPrice}</span>
          )}
        </div>

        {/* Frequently Bought Together */}
        <div className="mb-6">
          <FrequentlyBoughtTogether productId={product.id} />
        </div>

        {/* Description */}
        <p className="text-muted-foreground leading-relaxed mb-6">{product.description}</p>

        {/* Share on WhatsApp */}
        <button
          onClick={handleShareWhatsApp}
          className="w-full mb-6 flex items-center justify-center gap-2 bg-accent/10 border border-accent/30 rounded-xl py-3 px-4 transition-colors hover:bg-accent/20"
        >
          <span className="text-lg">💬</span>
          <span className="font-semibold text-accent text-sm">Share on WhatsApp</span>
        </button>

        {/* Loyalty Points — only shown when > 0, using same calc as cart */}
        {Math.floor(product.price * quantity / 100) > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-amber-700 font-semibold">
              ⭐ Earn {Math.floor(product.price * quantity / 100)} loyalty points with this purchase!
            </p>
          </div>
        )}

        {/* Quantity */}
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-foreground">Quantity</span>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="h-10 w-10 rounded-full">
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-xl font-bold w-8 text-center">{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              disabled={quantity >= maxAddable}
              onClick={() => setQuantity(Math.min(quantity + 1, maxAddable))}
              className="h-10 w-10 rounded-full"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {/* Stock hint */}
        {product.stockQuantity !== undefined && product.stockQuantity <= 10 && (
          <p className="text-xs text-amber-500 font-medium text-right mb-5">
            {product.stockQuantity === 0
              ? "Out of stock"
              : cartQty > 0
              ? `${maxAddable} more available (${cartQty} already in cart)`
              : `Only ${product.stockQuantity} left`}
          </p>
        )}
        {!(product.stockQuantity !== undefined && product.stockQuantity <= 10) && <div className="mb-6" />}

        {/* Customers Also Buy */}
        <CustomersAlsoBuy productId={product.id} />
      </div>

      {/* Fixed Add to Cart bar — shadow above to separate from content */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-card border-t border-border shadow-[0_-4px_16px_rgba(0,0,0,0.08)] p-4">
        <Button
          onClick={handleAddToCart}
          disabled={maxAddable === 0}
          className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 disabled:opacity-60"
        >
          <ShoppingCart className="w-5 h-5 mr-2" />
          {maxAddable === 0
            ? cartQty > 0 ? "Max in Cart" : "Out of Stock"
            : `Add to Cart - KSh ${product.price * quantity}`}
        </Button>
      </div>
    </div>
  );
};

export default ProductDetails;
