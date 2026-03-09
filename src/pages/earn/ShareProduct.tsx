import { useParams, useNavigate } from "react-router-dom";
import { products } from "@/data/products";
import { useCustomer } from "@/contexts/CustomerContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle, Facebook, Copy, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

const ShareProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Product not found</p>
      </div>
    );
  }

  const shareLink = `https://stery.ke/p/${product.id}?ref=${userData.referralCode}`;
  const shareMessage = `🛒 Check out ${product.name} for only KSh ${product.price}! Shop now: ${shareLink}`;

  const shareToWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, "_blank");
    toast.success("Opening WhatsApp...");
  };

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}&quote=${encodeURIComponent(shareMessage)}`;
    window.open(url, "_blank");
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
          <button
            onClick={() => navigate(-1)}
            className="bg-white/20 rounded-full p-2"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-white text-xl font-bold">Share Product</h1>
        </div>

        {/* Product Preview */}
        <div className="bg-white rounded-2xl p-4 flex gap-4 card-elevated">
          <img
            src={product.image}
            alt={product.name}
            className="w-20 h-20 rounded-lg object-cover"
          />
          <div className="flex-1">
            <h3 className="font-bold text-foreground">{product.name}</h3>
            <p className="text-lg font-bold text-foreground">KSh {product.price}</p>
            <p className="text-sm text-accent font-semibold">
              Earn KSh {product.commission}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        {/* Share Buttons */}
        <h2 className="text-lg font-bold text-foreground mb-4">
          Share to Earn
        </h2>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <Button
            onClick={shareToWhatsApp}
            className="h-16 bg-[#25D366] hover:bg-[#25D366]/90 text-white"
          >
            <MessageCircle className="w-6 h-6 mr-2" />
            WhatsApp
          </Button>
          <Button
            onClick={shareToFacebook}
            className="h-16 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white"
          >
            <Facebook className="w-6 h-6 mr-2" />
            Facebook
          </Button>
        </div>

        {/* Share Link */}
        <div className="bg-secondary rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">Your Share Link</p>
            <Button size="sm" variant="ghost" onClick={copyLink}>
              <Copy className="w-4 h-4 mr-1" />
              Copy
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
              <Copy className="w-4 h-4 mr-1" />
              Copy
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
