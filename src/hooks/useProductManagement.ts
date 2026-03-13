import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { adminFetch } from "@/lib/api/client";

interface Product {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  image_url?: string;
  category: string;
  subcategory?: string;
  description?: string;
  commission: number;
  loyalty_points: number;
  in_stock: boolean;
  stock_quantity: number;
  is_offer: boolean;
  created_at: string;
  updated_at: string;
}

// Fields that can be sent to Supabase (excludes auto-managed fields)
type ProductInsertUpdate = Omit<Product, 'id' | 'created_at' | 'updated_at'>;

export const useProductManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProducts = useCallback(async (filters?: {
    stock_status?: "in_stock" | "low_stock" | "out_of_stock" | "all";
    category?: string;
  }) => {
    setIsLoading(true);
    let query: any = supabase.from("products").select("*");

    if (filters?.category) {
      query = query.eq("category", filters.category);
    }
    if (filters?.stock_status && filters.stock_status !== "all") {
      if (filters.stock_status === "in_stock") {
        query = query.gt("stock_quantity", 10);
      } else if (filters.stock_status === "low_stock") {
        query = query.gte("stock_quantity", 1).lte("stock_quantity", 10);
      } else if (filters.stock_status === "out_of_stock") {
        query = query.eq("stock_quantity", 0);
      }
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch products");
      return;
    }
    const typedData = (data || []) as Product[];
    setProducts(typedData);
    setIsLoading(false);
  }, []);

  const addProduct = useCallback(
    async (product: Partial<ProductInsertUpdate>) => {
      try {
        const result = await adminFetch("/products", "POST", {
          name: product.name,
          price: product.price,
          original_price: product.original_price,
          image_url: product.image_url,
          category: product.category,
          subcategory: product.subcategory || null,
          description: product.description,
          commission: product.commission,
          loyalty_points: product.loyalty_points || 0,
          stock_quantity: product.stock_quantity ?? 100,
          is_offer: product.is_offer || false,
        });
        setProducts((prev) => [result.product, ...prev]);
        toast.success("Product added");
        return result.product;
      } catch (err: any) {
        const isOffline = err instanceof TypeError || err.message?.includes("fetch");
        toast.error(isOffline ? "Cannot reach the server. Please check your connection." : `Failed to add product: ${err.message}`);
        console.error("Add product error:", err);
        return null;
      }
    },
    []
  );

  const updateProduct = useCallback(
    async (id: string, updates: Partial<ProductInsertUpdate>) => {
      try {
        const result = await adminFetch(`/products/${id}`, "PUT", updates);
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...result.product } : p))
        );
        toast.success("Product updated");
        return true;
      } catch (err: any) {
        const isOffline = err instanceof TypeError || err.message?.includes("fetch");
        toast.error(isOffline ? "Cannot reach the server. Please check your connection." : `Failed to update product: ${err.message}`);
        console.error("Update product error:", err);
        return false;
      }
    },
    []
  );

  const deleteProduct = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete product");
      return false;
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
    toast.success("Product deleted");
    return true;
  }, []);

  const toggleVisibility = useCallback(
    async (id: string, currentIsOffer: boolean) => {
      const newIsOffer = !currentIsOffer;
      return updateProduct(id, { is_offer: newIsOffer });
    },
    [updateProduct]
  );

  return {
    products,
    isLoading,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleVisibility,
  };
};
