import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/data/products";

const LOOKBACK_DAYS = 30;

/** True if the product has a non-empty image URL. */
function hasImage(p: Product): boolean {
  return !!(p.image && p.image.trim() !== "");
}

/** True if the product is in stock by any available signal. */
function inStock(p: Product): boolean {
  return (
    p.inStock !== false &&
    p.stockStatus !== "out_of_stock" &&
    (p.stockQuantity === undefined || p.stockQuantity > 0)
  );
}

function qualifies(p: Product): boolean {
  return hasImage(p) && inStock(p);
}

/**
 * Returns up to `count` products for the "Popular Products" homepage shelf.
 *
 * Priority order:
 *   1. Best-sellers — products with highest total quantity sold in the last 30 days,
 *      filtered to those with a valid image and in stock.
 *   2. Featured fallback — products manually marked as is_featured=true by admin,
 *      with image and in stock, not already in the best-sellers list.
 *   3. General fallback — any remaining in-stock products with images, ordered
 *      by name, to fill remaining slots.
 *
 * This hook fires one Supabase query on mount (orders from last 30 days) and
 * derives the result entirely client-side against the already-loaded liveProducts
 * array, so it never causes an extra re-render on the products list.
 */
export function usePopularProducts(liveProducts: Product[], count = 8): Product[] {
  // Ordered list of productIds by total quantity sold (most sold first)
  const [rankedIds, setRankedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!liveProducts.length) return;

    const since = new Date(
      Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    supabase
      .from("orders")
      .select("items")
      .gte("created_at", since)
      .neq("status", "cancelled")
      .then(({ data, error }) => {
        if (error || !data?.length) return;

        const tally: Record<string, number> = {};
        for (const order of data) {
          const items = order.items as { productId?: string; product_id?: string; quantity?: number }[] | null;
          if (!Array.isArray(items)) continue;
          for (const item of items) {
            const id = item.productId ?? item.product_id;
            if (!id) continue;
            tally[id] = (tally[id] ?? 0) + (item.quantity ?? 1);
          }
        }

        const sorted = Object.entries(tally)
          .sort(([, a], [, b]) => b - a)
          .map(([id]) => id);

        setRankedIds(sorted);
      });
  }, [liveProducts.length]); // re-run if products load async after mount

  // --- Build result list ---

  // 1. Best sellers: match ranked IDs to live products, apply quality filter
  const bestSellers = rankedIds
    .map((id) => liveProducts.find((p) => p.id === id))
    .filter((p): p is Product => !!p && qualifies(p));

  const usedIds = new Set(bestSellers.map((p) => p.id));

  // 2. Featured fallback: manually marked products not already in best sellers
  const featured = liveProducts.filter(
    (p) => p.isFeatured && qualifies(p) && !usedIds.has(p.id)
  );
  featured.forEach((p) => usedIds.add(p.id));

  // 3. General fallback: any remaining qualifying products
  const general = liveProducts.filter((p) => qualifies(p) && !usedIds.has(p.id));

  return [...bestSellers, ...featured, ...general].slice(0, count);
}
