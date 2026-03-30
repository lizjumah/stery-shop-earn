import { useState } from "react";
import { Link } from "react-router-dom";
import { ShopHeader } from "@/components/ShopHeader";
import { subcategoryConfig } from "@/data/products";
import { SHOP_CATEGORIES } from "@/data/categoryConfig";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

const AllCategoriesPage = () => {
  const [selectedDb, setSelectedDb] = useState<string>(SHOP_CATEGORIES[0].db);
  const selectedCat = SHOP_CATEGORIES.find((c) => c.db === selectedDb)!;
  const subcategories = subcategoryConfig[selectedDb] ?? [];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Page header — scrolls away, not sticky */}
      <ShopHeader title="Browse by Category" showBack />

      {/* ── Sticky horizontal category navigation bar ── */}
      <div className="sticky top-0 z-20 bg-card border-b border-border shadow-sm">
        {/* Desktop/tablet: wrap into rows. Mobile: horizontal scroll. */}
        <div className="flex overflow-x-auto scrollbar-hide sm:flex-wrap sm:overflow-x-visible px-2 py-0">
          {SHOP_CATEGORIES.map((cat) => (
            <button
              key={cat.db}
              onClick={() => setSelectedDb(cat.db)}
              className={cn(
                "px-2.5 py-1.5 shrink-0 text-xs font-medium whitespace-nowrap transition-colors border-b-2",
                selectedDb === cat.db
                  ? "border-b-primary text-primary"
                  : "border-b-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Subcategory content panel ── */}
      <div className="px-4 pt-3 pb-6">

        {/* Section heading — category name + shortcut link */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold text-foreground text-base flex items-center gap-1.5">
              <span className="text-lg leading-none">{selectedCat.emoji}</span>
              {selectedCat.label}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {subcategories.length > 0
                ? `${subcategories.length} subcategories`
                : "Browse all products in this category"}
            </p>
          </div>
          <Link
            to={`/shop/categories?cat=${encodeURIComponent(selectedDb)}`}
            className="flex items-center gap-1 text-xs font-semibold text-primary shrink-0"
          >
            View All <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Browse all banner button */}
        <Link
          to={`/shop/categories?cat=${encodeURIComponent(selectedDb)}`}
          className="flex items-center justify-between w-full rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 mb-4"
        >
          <span className="text-sm font-semibold text-primary">
            Browse All {selectedCat.label}
          </span>
          <ChevronRight className="w-4 h-4 text-primary" />
        </Link>

        {/* Subcategory grid */}
        {subcategories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
            {subcategories.map((sub) => (
              <Link
                key={sub}
                to={`/shop/categories?cat=${encodeURIComponent(selectedDb)}`}
                className="bg-card rounded-lg px-3 py-2 text-xs font-medium text-foreground card-elevated text-center border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                {sub}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">
            No subcategories listed — tap "Browse All" above to see products.
          </p>
        )}

      </div>
    </div>
  );
};

export default AllCategoriesPage;
