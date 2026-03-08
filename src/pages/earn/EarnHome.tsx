import { useState } from "react";
import { products, categories } from "@/data/products";
import { userData } from "@/data/user";
import { ProductCard } from "@/components/ProductCard";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Search, TrendingUp, Users, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EarnHome = () => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const copyReferralLink = () => {
    navigator.clipboard.writeText(userData.referralLink);
    toast.success("Referral link copied!");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-earn px-4 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/80 text-sm">Hello Reseller,</p>
            <h1 className="text-white text-xl font-bold">{userData.name.split(" ")[0]}</h1>
          </div>
          <div className="bg-white/20 rounded-full px-4 py-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-white" />
            <span className="text-white font-semibold">KSh {userData.totalEarnings}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white/20 rounded-xl p-3">
            <p className="text-white/80 text-xs">Pending</p>
            <p className="text-white font-bold text-lg">KSh {userData.pendingEarnings}</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3">
            <p className="text-white/80 text-xs">Referrals</p>
            <p className="text-white font-bold text-lg">{userData.referredUsers} people</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products to sell..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card rounded-full py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      <div className="px-4 mt-6">
        {/* Referral Card */}
        <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground font-semibold">Your Referral Link</p>
              <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                {userData.referralLink}
              </p>
            </div>
            <Button
              size="sm"
              onClick={copyReferralLink}
              className="bg-accent hover:bg-accent/90"
            >
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4 scrollbar-hide">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "rounded-full whitespace-nowrap",
                selectedCategory === category && "bg-accent hover:bg-accent/90"
              )}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Products Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Products to Sell</h2>
          <p className="text-sm text-muted-foreground">{filteredProducts.length} items</p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 gap-3">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default EarnHome;
