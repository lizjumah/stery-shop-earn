import { ShoppingCart } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";

const SHOP_PREFIXES = ["/shop", "/earn", "/profile", "/admin"];

export const FloatingCart = () => {
  const { cartItemCount, mode } = useApp();
  const location = useLocation();

  // Only show on shop-related pages, not on cart/checkout/welcome
  const path = location.pathname;
  const isShopPage = SHOP_PREFIXES.some((p) => path.startsWith(p));
  const isHidden = !isShopPage || path === "/shop/cart" || path === "/shop/checkout";

  if (!mode || isHidden || cartItemCount === 0) return null;

  return (
    <Link
      to="/shop/cart"
      className="fixed bottom-24 right-4 z-50 bg-primary text-primary-foreground rounded-full px-4 py-3 flex items-center gap-2 shadow-lg active:scale-95 transition-transform"
    >
      <ShoppingCart className="w-5 h-5" />
      <span className="text-sm font-bold">Cart ({cartItemCount})</span>
    </Link>
  );
};
