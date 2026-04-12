import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Share2, Copy, ShoppingBag, Store } from "lucide-react";
import { toast } from "sonner";

interface StorefrontProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  commission?: number;
}

interface Storefront {
  id: string;
  name: string;
  referral_code: string | null;
  storefront_name: string | null;
  storefront_bio: string | null;
  products: StorefrontProduct[];
}

async function fetchStorefront(referralCode: string): Promise<Storefront | null> {
  // 1. Find the reseller by referral_code
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id, name, referral_code")
    .eq("referral_code", referralCode)
    .maybeSingle();

  if (customerError) throw customerError;
  if (!customer) return null;

  const c = customer as any;

  // 2. Get their active product IDs from reseller_products
  const { data: rp, error: rpError } = await (supabase as any)
    .from("reseller_products")
    .select("product_id")
    .eq("reseller_id", customer.id)
    .eq("is_active", true);

  if (rpError) throw rpError;

  const productIds: string[] = (rp ?? []).map((r: any) => r.product_id);

  if (productIds.length === 0) {
    return {
      id: customer.id,
      name: customer.name,
      referral_code: customer.referral_code,
      storefront_name: c.storefront_name ?? null,
      storefront_bio: c.storefront_bio ?? null,
      products: [],
    };
  }

  // 3. Fetch those products — earnable and visible only
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, price, original_price, image_url, category, commission")
    .in("id", productIds)
    .eq("is_earnable" as any, true)
    .eq("visibility", "visible")
    .order("name");

  if (productsError) throw productsError;

  return {
    id: customer.id,
    name: customer.name,
    referral_code: customer.referral_code,
    storefront_name: c.storefront_name ?? null,
    storefront_bio: c.storefront_bio ?? null,
    products: (products ?? []).map((row: any) => ({
      id: row.id,
      name: row.name,
      price: Number(row.price),
      originalPrice: row.original_price != null ? Number(row.original_price) : undefined,
      image: row.image_url ?? "",
      category: row.category,
      commission: row.commission != null ? Number(row.commission) : undefined,
    })),
  };
}

const ResellerStorefront = () => {
  const { referralCode } = useParams<{ referralCode: string }>();

  const { data: storefront, isLoading, isError } = useQuery({
    queryKey: ["storefront", referralCode],
    queryFn: () => fetchStorefront(referralCode!),
    enabled: !!referralCode,
    staleTime: 5 * 60 * 1000,
  });

  const shopUrl = `${window.location.origin}/shop/${referralCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shopUrl);
    toast.success("Shop link copied!");
  };

  const shareLink = () => {
    const text = `Check out ${storefront?.storefront_name || storefront?.name || "this shop"} on Stery: ${shopUrl}`;
    if (navigator.share) {
      navigator.share({ text, url: shopUrl }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading shop…</p>
      </div>
    );
  }

  if (isError || !storefront) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <Store className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-semibold mb-1">Shop not found</p>
          <p className="text-muted-foreground text-sm mb-4">
            This shop link is invalid or the reseller hasn't set up their store yet.
          </p>
          <Link to="/shop">
            <Button className="bg-accent hover:bg-accent/90">Browse Stery Shop</Button>
          </Link>
        </div>
      </div>
    );
  }

  const displayName = storefront.storefront_name || storefront.name;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-earn px-4 pt-6 pb-6 rounded-b-3xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Store className="w-5 h-5 text-white/80 shrink-0" />
              <h1 className="text-white text-xl font-bold truncate">{displayName}'s Shop</h1>
            </div>
            {storefront.storefront_bio && (
              <p className="text-white/70 text-sm leading-snug">{storefront.storefront_bio}</p>
            )}
            <p className="text-white/50 text-xs mt-1">
              {storefront.products.length} product{storefront.products.length !== 1 ? "s" : ""} available
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={copyLink}
              className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
              title="Copy shop link"
            >
              <Copy className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={shareLink}
              className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
              title="Share shop"
            >
              <Share2 className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        {storefront.products.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-semibold mb-1">No products yet</p>
            <p className="text-muted-foreground text-sm">This reseller hasn't added any products to their shop yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {storefront.products.map((product) => (
              <Link
                key={product.id}
                to={`/shop/product/${product.id}?ref=${referralCode}`}
                className="flex flex-col bg-card rounded-lg overflow-hidden card-elevated"
              >
                <div className="relative aspect-[3/2] overflow-hidden rounded-t-lg shrink-0">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col flex-1 px-2.5 pt-1.5 pb-2">
                  <h3 className="font-semibold text-sm line-clamp-2 text-foreground leading-snug">
                    {product.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{product.category}</p>
                  <div className="flex items-center justify-between mt-auto pt-1.5">
                    <div>
                      <span className="font-bold text-sm text-foreground">KSh {product.price}</span>
                      {product.originalPrice && (
                        <span className="text-xs text-muted-foreground line-through ml-1">
                          KSh {product.originalPrice}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                      Buy
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResellerStorefront;
