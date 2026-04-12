import { useParams, useNavigate } from "react-router-dom";
import { useProduct } from "@/hooks/useProducts";
import { useCustomer } from "@/contexts/CustomerContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle, Copy, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

const ShareProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { customer } = useCustomer();
  const referralCode =
    customer?.referral_code ||
    customer?.phone?.replace(/\s+/g, "").slice(-6).toUpperCase() ||
    "STERY";

  const { product, isLoading } = useProduct(id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  if (!product || product.isEarnable !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-foreground font-semibold mb-2">Product not available</p>
          <p className="text-muted-foreground text-sm mb-4">This product is not available for earning.</p>
          <Button onClick={() => navigate("/earn/products")} className="bg-accent hover:bg-accent/90">
            Browse earnable products
          </Button>
        </div>
      </div>
    );
  }

  const shareLink = `${window.location.origin}/shop/product/${product.id}?ref=${referralCode}`;
  const shareMessage = `🛒 Check out ${product.name} for only KSh ${product.price}! Shop now: ${shareLink}`;

  const shareToWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, "_blank");
    toast.success("Opening WhatsApp...");
  };

  const shareToFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}&quote=${encodeURIComponent(shareMessage)}`,
      "_blank"
    );
    toast.success("Opening Facebook...");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success("Link copied to clipboard!");
  };

  const copyMessage = () => {
    navigator.clipboard.writeText(shareMessage);
    toast.success("Message copied!");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-earn px-4 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="bg-white/20 rounded-full p-2">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-white text-xl font-bold">Share Product</h1>
        </div>

        {/* Product Preview */}
        <div className="bg-white rounded-2xl p-4 flex gap-4 card-elevated">
          <img src={product.image} alt={product.name} className="w-20 h-20 rounded-lg object-cover" />
          <div className="flex-1">
            <h3 className="font-bold text-foreground">{product.name}</h3>
            <p className="text-lg font-bold text-foreground">KSh {product.price}</p>
            <p className="text-sm text-accent font-semibold">Earn KSh {product.commission}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Share to Earn</h2>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <Button onClick={shareToWhatsApp} className="h-16 bg-[#25D366] hover:bg-[#25D366]/90 text-white">
            <MessageCircle className="w-6 h-6 mr-2" />
            WhatsApp
          </Button>
          <Button onClick={shareToFacebook} className="h-16 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white">
            <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
            </svg>
            Facebook
          </Button>
        </div>

        {/* Share Link */}
        <div className="bg-secondary rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">Your Share Link</p>
            <Button size="sm" variant="ghost" onClick={copyLink}>
              <Copy className="w-4 h-4 mr-1" />Copy
            </Button>
          </div>
          <div className="bg-card rounded-lg p-3 flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-muted-foreground truncate">{shareLink}</p>
          </div>
        </div>

        {/* Share Message */}
        <div className="bg-secondary rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">Ready-to-send Message</p>
            <Button size="sm" variant="ghost" onClick={copyMessage}>
              <Copy className="w-4 h-4 mr-1" />Copy
            </Button>
          </div>
          <div className="bg-card rounded-lg p-3">
            <p className="text-sm text-foreground">{shareMessage}</p>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-accent/10 border border-accent/30 rounded-xl p-4">
          <h3 className="font-bold text-foreground mb-3">💡 Tips to Earn More</h3>
          <ul className="space-y-2 text-sm text-foreground">
            <li>• Share to WhatsApp groups with many members</li>
            <li>• Post on Facebook Marketplace</li>
            <li>• Share with family and friends</li>
            <li>• Add your own recommendation message</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ShareProduct;
