import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { ShoppingBag, TrendingUp } from "lucide-react";

const Welcome = () => {
  const navigate = useNavigate();
  const { setMode } = useApp();

  const handleChoice = (choice: "shop" | "earn") => {
    setMode(choice);
    navigate(choice === "shop" ? "/shop" : "/earn");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl font-bold text-foreground mb-2">
            Stery
          </h1>
          <p className="text-muted-foreground text-lg">
            Shop. Earn. Grow.
          </p>
        </div>

        <p className="text-center text-foreground text-xl mb-10 font-medium">
          What would you like to do today?
        </p>

        {/* Choice Cards */}
        <div className="w-full max-w-sm space-y-4">
          {/* Shop Card */}
          <button
            onClick={() => handleChoice("shop")}
            className="w-full gradient-shop rounded-2xl p-6 text-left card-elevated transform transition-transform active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/20 rounded-full p-4">
                <ShoppingBag className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">
                  I want to Shop
                </h2>
                <p className="text-white/80 mt-1">
                  Browse products, earn points & get rewards
                </p>
              </div>
            </div>
          </button>

          {/* Earn Card */}
          <button
            onClick={() => handleChoice("earn")}
            className="w-full gradient-earn rounded-2xl p-6 text-left card-elevated transform transition-transform active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/20 rounded-full p-4">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">
                  I want to Earn
                </h2>
                <p className="text-white/80 mt-1">
                  Sell products, earn commission & grow your income
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="py-6 text-center">
        <p className="text-sm text-muted-foreground">
          Powered by Stery Kenya
        </p>
      </div>
    </div>
  );
};

export default Welcome;
