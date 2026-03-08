import { Link } from "react-router-dom";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

interface ShopHeaderProps {
  title: string;
  showBack?: boolean;
}

export const ShopHeader = ({ title, showBack = false }: ShopHeaderProps) => {
  const { cartItemCount } = useApp();

  return (
    <div className="flex items-center justify-between px-4 pt-6 pb-4">
      <div className="flex items-center gap-3">
        {showBack && (
          <Link to="/shop" className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
        )}
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
      </div>
      <Link to="/shop/cart" className="relative bg-primary/10 rounded-full p-2.5">
        <ShoppingCart className="w-5 h-5 text-primary" />
        {cartItemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {cartItemCount}
          </span>
        )}
      </Link>
    </div>
  );
};
