import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProducts } from "./useProducts";
import type { Product } from "@/data/products";

interface RawOrderItem {
  productId?: string;
  [key: string]: unknown;
}

/**
 * Returns up to 8 unique Product objects that the customer has ordered before,
 * derived from their last 5 orders. Returns an empty array when the customer
 * has no orders or is not logged in.
 */
export function useBuyAgain(customerId: string | undefined) {
  const { data: liveProducts = [] } = useProducts();

  const { data: recentProductIds = [] } = useQuery<string[]>({
    queryKey: ["buy-again", customerId],
    enabled: !!customerId,
    staleTime: 2 * 60 * 1000, // 2 min — order history doesn't change every second
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("items")
        .eq("customer_id", customerId!)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error || !data) return [];

      // Flatten items from all orders, extract productIds, deduplicate
      const seen = new Set<string>();
      const ids: string[] = [];

      for (const order of data) {
        const items: RawOrderItem[] = Array.isArray(order.items) ? order.items : [];
        for (const item of items) {
          const pid = item.productId;
          if (pid && typeof pid === "string" && !seen.has(pid)) {
            seen.add(pid);
            ids.push(pid);
          }
        }
      }

      return ids;
    },
  });

  const products: Product[] = recentProductIds
    .map((id) => liveProducts.find((p) => p.id === id))
    .filter((p): p is Product =>
      p !== undefined &&
      p.inStock !== false &&
      p.stockStatus !== "out_of_stock" &&
      (p.stockQuantity === undefined || p.stockQuantity > 0)
    )
    .slice(0, 8);

  return products;
}
