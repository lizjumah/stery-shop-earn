import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { products as staticProducts, type Product } from "@/data/products";

/** Fetch products from Supabase, falling back to the static catalog if the table is not yet populated. */
export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name");

      if (error || !data || data.length === 0) {
        // Table not yet migrated or empty — use static catalog
        return staticProducts;
      }

      // Map Supabase column names → Product interface
      return data.map((row) => ({
        id: row.id,
        name: row.name,
        price: Number(row.price),
        originalPrice: row.original_price != null ? Number(row.original_price) : undefined,
        image: row.image_url ?? "",
        category: row.category,
        description: row.description ?? "",
        commission: row.commission != null ? Number(row.commission) : undefined,
        loyaltyPoints: row.loyalty_points ?? 0,
        inStock: row.in_stock ?? true,
        stockQuantity: row.stock_quantity ?? 100,
        isOffer: row.is_offer ?? false,
        subcategory: row.subcategory ?? undefined,
        stockStatus: (row.stock_status as "in_stock" | "low_stock" | "out_of_stock") ?? "in_stock",
        barcode: row.barcode ?? undefined,
        isAgeRestricted: row.is_age_restricted ?? false,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 min — products don't change every second
  });
}

/** Fetch a single product by id */
export function useProduct(id: string | undefined) {
  const { data: all, isLoading, isFetching, ...rest } = useProducts();
  // Search live (Supabase) products first; fall back to static catalog for old
  // bookmarked URLs or any ID mismatch between list and detail page cache states.
  const product = id
    ? ((all ?? []).find((p) => p.id === id) ?? staticProducts.find((p) => p.id === id))
    : undefined;
  // Treat as loading if the query is still in flight AND we have no product yet.
  const effectivelyLoading = (isLoading || (isFetching && !product));
  return { product, isLoading: effectivelyLoading, isFetching, ...rest };
}
