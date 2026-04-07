import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductImage {
  id: string;
  image_url: string;
  sort_order: number;
}

/**
 * Fetches extra gallery images for a product from the product_images table.
 * Returns an empty array if none exist — callers must handle this gracefully.
 * products.image_url (the cover image) is NOT included here.
 */
export function useProductImages(productId: string | undefined) {
  return useQuery<ProductImage[]>({
    queryKey: ["product_images", productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from("product_images")
        .select("id, image_url, sort_order")
        .eq("product_id", productId)
        .order("sort_order", { ascending: true });
      if (error) return [];
      return data ?? [];
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
  });
}
