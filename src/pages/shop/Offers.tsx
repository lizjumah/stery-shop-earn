import { products } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import { BottomNav } from "@/components/BottomNav";
import { ShopHeader } from "@/components/ShopHeader";
import { ArrowLeft, Percent } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Offers = () => {
  const navigate = useNavigate();
  const offerProducts = products.filter((p) => p.isOffer);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-destructive px-4 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="bg-white/20 rounded-full p-2"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-white text-xl font-bold">Today's Offers</h1>
        </div>
        
        <div className="bg-white/20 rounded-xl p-4 flex items-center gap-3">
          <div className="bg-white rounded-full p-3">
            <Percent className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <p className="text-white font-bold">Save up to 30%!</p>
            <p className="text-white/80 text-sm">Limited time offers on selected items</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-6">
        <h2 className="text-lg font-bold text-foreground mb-4">
          🔥 Hot Deals ({offerProducts.length})
        </h2>
        
        <div className="grid grid-cols-2 gap-3">
          {offerProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {offerProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No offers available right now</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Offers;
