import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { categories, subcategoryConfig } from "@/data/products";
import { useProducts } from "@/hooks/useProducts";
import { ProductCard } from "@/components/ProductCard";
import { ShopHeader } from "@/components/ShopHeader";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const Categories = () => {
  const [searchParams] = useSearchParams();
  const initialCat = searchParams.get("cat") || "All";
  const [selectedCategory, setSelectedCategory] = useState(initialCat);
  const [selectedSubcategory, setSelectedSubcategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [offersOnly, setOffersOnly] = useState(false);
  const { data: liveProducts = [] } = useProducts();

  // Sync category from URL param
  useEffect(() => {
    const cat = searchParams.get("cat");
    if (cat) {
      setSelectedCategory(cat);
      setSelectedSubcategory("All"); // reset subcategory when URL changes
    }
  }, [searchParams]);

  // Reset subcategory when category changes
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setSelectedSubcategory("All");
  };

  // Derive available subcategories from products actually in this category
  // (union of config + any live subcategories not in config)
  const configSubs = selectedCategory !== "All"
    ? (subcategoryConfig[selectedCategory] ?? [])
    : [];
  const liveSubs = selectedCategory !== "All"
    ? [...new Set(liveProducts
        .filter((p) => p.category === selectedCategory && p.subcategory)
        .map((p) => p.subcategory as string))]
    : [];
  // Config order first, then any extras from DB
  const subcategories = [
    ...configSubs,
    ...liveSubs.filter((s) => !configSubs.includes(s)),
  ];

  const filteredProducts = liveProducts.filter((product) => {
    const matchesCategory    = selectedCategory === "All" || product.category === selectedCategory;
    const matchesSubcategory = selectedSubcategory === "All" || product.subcategory === selectedSubcategory;
    const matchesSearch      = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOffers      = !offersOnly || product.isOffer;
    return matchesCategory && matchesSubcategory && matchesSearch && matchesOffers;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <ShopHeader title="All Products" showBack />
      <div className="px-4 pb-4">

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card rounded-full py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary border border-border"
          />
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => handleCategoryChange(category)}
              className={cn(
                "rounded-full whitespace-nowrap",
                selectedCategory === category && "bg-primary"
              )}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Subcategory chips — shown only when a specific category is selected */}
        {selectedCategory !== "All" && subcategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
            <button
              onClick={() => setSelectedSubcategory("All")}
              className={cn(
                "text-xs rounded-full px-3 py-1.5 font-medium whitespace-nowrap border transition-colors shrink-0",
                selectedSubcategory === "All"
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-card text-muted-foreground border-border hover:border-primary/30"
              )}
            >
              All
            </button>
            {subcategories.map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubcategory(sub)}
                className={cn(
                  "text-xs rounded-full px-3 py-1.5 font-medium whitespace-nowrap border transition-colors shrink-0",
                  selectedSubcategory === sub
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-card text-muted-foreground border-border hover:border-primary/30"
                )}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        {/* Offers toggle */}
        <button
          onClick={() => setOffersOnly(!offersOnly)}
          className={cn(
            "text-sm rounded-full px-3 py-1 border mb-4",
            offersOnly
              ? "bg-destructive text-destructive-foreground border-destructive"
              : "border-border text-muted-foreground"
          )}
        >
          🔥 Offers only
        </button>

        {/* Count */}
        <p className="text-sm text-muted-foreground mb-3">{filteredProducts.length} products</p>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-3">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No products found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Categories;
