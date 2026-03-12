import { ShoppingCart } from "lucide-react";

export const TopBar = () => {
  return (
    <div className="w-screen bg-white border-b border-border shadow-sm sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 lg:px-6 py-4 max-w-full">
        {/* Logo + Branding */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg gradient-shop flex items-center justify-center shrink-0">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-black text-foreground">Stery</h1>
            <p className="text-[10px] text-muted-foreground font-medium">Your Variety Store</p>
          </div>
        </div>

        {/* Optional: Right side actions can go here */}
        <div className="text-right text-xs text-muted-foreground font-medium">
          <p>Shopping made easy</p>
        </div>
      </div>
    </div>
  );
};
