import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  stock_status?: "in_stock" | "low_stock" | "out_of_stock";
  barcode?: string | null;
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
      const payload = {
        name: product.name,
        price: product.price,
        original_price: product.original_price ?? null,
        image_url: product.image_url ?? null,
        category: product.category,
        subcategory: product.subcategory || null,
        description: product.description ?? null,
        commission: product.commission ?? 0,
        loyalty_points: product.loyalty_points ?? 0,
        stock_quantity: product.stock_quantity ?? 100,
        is_offer: product.is_offer ?? false,
        stock_status: product.stock_status ?? "in_stock",
        barcode: product.barcode ?? null,
      };

      const { data, error } = await supabase
        .from("products")
        .insert(payload)
        .select()
        .single();

      if (error) {
        toast.error(`Failed to add product: ${error.message}`);
        return null;
      }

      setProducts((prev) => [data as Product, ...prev]);
      toast.success("Product added");
      return data as Product;
    },
    []
  );

  const updateProduct = useCallback(
    async (id: string, updates: Partial<ProductInsertUpdate>) => {
      const { data, error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        toast.error(`Failed to update product: ${error.message}`);
        return false;
      }
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...(data as Product) } : p))
      );
      toast.success("Product updated");
      return true;
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
