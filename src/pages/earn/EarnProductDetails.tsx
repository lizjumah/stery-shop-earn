import { useParams, useNavigate } from "react-router-dom";
import { products } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Share2, Star, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const EarnProductDetails = () => {
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
        <Badge className="absolute top-4 right-4 bg-accent text-accent-foreground text-lg px-3 py-1">
          Earn KSh {product.commission}
        </Badge>
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

        {/* Commission Card */}
        <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-accent rounded-full p-3">
              <TrendingUp className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <p className="text-foreground font-bold text-lg">
                Earn KSh {product.commission} per sale
              </p>
              <p className="text-sm text-muted-foreground">
                Share this product and earn commission when someone buys
              </p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-secondary rounded-xl p-4 mb-6">
          <h3 className="font-bold text-foreground mb-3">How to Earn</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="bg-accent text-accent-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                1
              </div>
              <p className="text-sm text-foreground">Share product to WhatsApp or Facebook</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-accent text-accent-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                2
              </div>
              <p className="text-sm text-foreground">Customer clicks your link and orders</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-accent text-accent-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                3
              </div>
              <p className="text-sm text-foreground">You earn KSh {product.commission} commission!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
        <Link to={`/earn/share/${product.id}`}>
          <Button className="w-full h-14 text-lg font-semibold bg-accent hover:bg-accent/90">
            <Share2 className="w-5 h-5 mr-2" />
            Share & Earn KSh {product.commission}
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default EarnProductDetails;
