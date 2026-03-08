import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { ShoppingBag, TrendingUp, Truck, Gift, Users } from "lucide-react";

const Welcome = () => {
  const navigate = useNavigate();
  const { setMode } = useApp();

  const handleChoice = (choice: "shop" | "earn") => {
    setMode(choice);
    navigate(choice === "shop" ? "/shop" : "/earn");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-shop mb-4">
            <span className="text-3xl font-black text-white">S</span>
          </div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">
            STERY
          </h1>
          <p className="text-primary font-semibold text-lg mt-1">
            Shop smart. Earn more.
          </p>
          <p className="text-muted-foreground text-sm mt-2 max-w-[280px] mx-auto">
            Buy your favorite products or earn money by reselling them.
          </p>
        </div>

        {/* Choice Cards */}
        <div className="w-full max-w-sm space-y-4">
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
                  Shop with Stery
                </h2>
                <p className="text-white/80 mt-1 text-sm">
                  Browse products, earn points & get rewards
                </p>
              </div>
            </div>
          </button>

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
                  Earn with Stery
                </h2>
                <p className="text-white/80 mt-1 text-sm">
                  Sell products, earn commission & grow income
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <div className="flex items-center gap-1.5 bg-card rounded-full px-3 py-1.5 card-elevated">
            <Truck className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">Delivery available</span>
          </div>
          <div className="flex items-center gap-1.5 bg-card rounded-full px-3 py-1.5 card-elevated">
            <Gift className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">Loyalty rewards</span>
          </div>
          <div className="flex items-center gap-1.5 bg-card rounded-full px-3 py-1.5 card-elevated">
            <Users className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-medium text-foreground">Reseller commissions</span>
          </div>
        </div>
      </div>

      <div className="py-6 text-center">
        <p className="text-xs text-muted-foreground">
          Powered by Stery Kenya 🇰🇪
        </p>
      </div>
    </div>
  );
};

export default Welcome;
