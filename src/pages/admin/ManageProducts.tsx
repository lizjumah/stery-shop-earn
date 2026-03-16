import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { API_BASE } from "@/lib/api/client";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { useProductManagement } from "@/hooks/useProductManagement";
import { useCustomer, getCustomerRole } from "@/contexts/CustomerContext";
import { useImageUpload } from "@/hooks/useImageUpload";
import { subcategoryConfig } from "@/data/products";
import { Button } from "@/components/ui/button";
import { ShopHeader } from "@/components/ShopHeader";
import {
  Plus,
  Edit2,
  Eye,
  EyeOff,
  Trash2,
  Search,
  Loader2,
  Package,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ManageProducts = () => {
  const { products, isLoading, fetchProducts, addProduct, updateProduct, deleteProduct, toggleVisibility } =
    useProductManagement();
  const { customer } = useCustomer();
  const { uploading: imageUploading, uploadImage } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [scanning, setScanning] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    category: "Groceries",
    subcategory: "",
    description: "",
    stock_quantity: 100,
    commission: 0,
    image_url: "",
    stock_status: "in_stock" as "in_stock" | "low_stock" | "out_of_stock",
    barcode: "",
  });
  const [customSubcategory, setCustomSubcategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");

  // owner and legacy is_admin can create new categories/subcategories; staff cannot
  const canManageCatalog =
    getCustomerRole(customer) === "owner" || customer?.is_admin === true;

  useEffect(() => {
    fetchProducts({ stock_status: stockFilter, category: categoryFilter || undefined });
  }, [stockFilter, categoryFilter, fetchProducts]);

  const BUILT_IN_CATEGORIES = ["Groceries", "Bakery", "Electronics", "Baby Items", "Household", "Jewelry"];
  const categories = [...new Set([...BUILT_IN_CATEGORIES, ...products.map((p) => p.category).filter(Boolean)])];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || formData.price <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!editingId) {
      const normalized = formData.name.trim().toLowerCase().replace(/\s+/g, " ");
      const exactMatch = products.find(
        (p) => p.name.trim().toLowerCase().replace(/\s+/g, " ") === normalized
      );
      if (exactMatch) {
        toast.error("A product with this exact name already exists.");
        return;
      }
    }

    // Barcode validation:
    // - CREATE: required + duplicate check (always call backend)
    // - EDIT:   duplicate check only if barcode is non-blank (never block blank)
    const barcodeValue = formData.barcode.trim();
    const isCreate = !editingId;
    if (isCreate || barcodeValue) {
      let barcodeError: string | null = null;
      try {
        const customerId = localStorage.getItem("stery_customer_id") || "";
        const res = await fetch(`${API_BASE}/api/admin/products/validate-barcode`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Customer-ID": customerId },
          body: JSON.stringify({ barcode: barcodeValue, excludeId: editingId ?? undefined, isCreate }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.required) barcodeError = "Barcode is required for new products.";
          else if (json.duplicate) barcodeError = "This barcode is already assigned to another product.";
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch {
        // Backend unreachable — enforce rules locally
        if (isCreate && !barcodeValue) {
          barcodeError = "Barcode is required for new products.";
        } else if (barcodeValue) {
          let query = supabase
            .from("products")
            .select("id, name")
            .eq("barcode", barcodeValue);
          if (editingId) query = query.neq("id", editingId);
          const { data: barcodeMatch } = await query.maybeSingle();
          if (barcodeMatch) barcodeError = "This barcode is already assigned to another product.";
        }
      }
      if (barcodeError) {
        toast.error(barcodeError);
        return;
      }
    }

    if (editingId) {
      await updateProduct(editingId, formData);
      setEditingId(null);
    } else {
      await addProduct(formData);
    }

    setFormData({
      name: "",
      price: 0,
      category: "Groceries",
      subcategory: "",
      description: "",
      stock_quantity: 100,
      commission: 0,
      image_url: "",
      stock_status: "in_stock",
      barcode: "",
    });
    setCustomSubcategory("");
    setCustomCategory("");
    setShowForm(false);
  };

  const handleEdit = (p: any) => {
    const sub = p.subcategory || "";
    const knownSubs = subcategoryConfig[p.category] ?? [];
    setFormData({
      name: p.name,
      price: p.price,
      category: p.category,
      subcategory: sub,
      description: p.description || "",
      stock_quantity: p.stock_quantity,
      commission: p.commission,
      image_url: p.image_url || "",
      stock_status: (p.stock_status as "in_stock" | "low_stock" | "out_of_stock") ?? "in_stock",
      barcode: p.barcode ?? "",
    });
    // If subcategory not in the config list, pre-fill the custom input
    if (sub && !knownSubs.includes(sub)) {
      setCustomSubcategory(sub);
    } else {
      setCustomSubcategory("");
    }
    setImagePreview(p.image_url || "");
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setScanning(false);
    setImagePreview("");
    setCustomSubcategory("");
    setCustomCategory("");
    setFormData({
      name: "",
      price: 0,
      category: "Groceries",
      subcategory: "",
      description: "",
      stock_quantity: 100,
      commission: 0,
      image_url: "",
      stock_status: "in_stock",
      barcode: "",
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file);
    if (url) {
      setFormData({ ...formData, image_url: url });
      setImagePreview(url);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearImage = () => {
    setFormData({ ...formData, image_url: "" });
    setImagePreview("");
  };

  const getStockStatus = (qty: number) => {
    if (qty === 0) return "out_of_stock";
    if (qty <= 10) return "low_stock";
    return "in_stock";
  };

  const filteredProducts = products.filter((p) => {
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (categoryFilter && p.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <ShopHeader title="Manage Products" showBack />

      <div className="px-4 py-6 space-y-4">
        {/* Add Product Button */}
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="w-full bg-primary hover:bg-primary/90 h-12 gap-2"
          >
            <Plus className="w-5 h-5" />
            Add New Product
          </Button>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-card rounded-xl p-4 card-elevated space-y-3 border border-primary/20">
            <h3 className="font-semibold text-foreground">
              {editingId ? "Edit Product" : "Add New Product"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground font-medium">Product Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Fresh Milk 500ml"
                  className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {!editingId && (() => {
                  const q = formData.name.trim().toLowerCase();
                  if (q.length < 3) return null;
                  const match = products.find((p) =>
                    p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase())
                  );
                  if (!match) return null;
                  return (
                    <p className="mt-1 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-2.5 py-1.5">
                      ⚠️ Similar product already exists:{" "}
                      <button
                        type="button"
                        className="font-semibold underline underline-offset-2 hover:text-yellow-900"
                        onClick={() => {
                          const el = document.getElementById(`product-${match.id}`);
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth", block: "center" });
                            el.classList.add("ring-2", "ring-yellow-400");
                            setTimeout(() => el.classList.remove("ring-2", "ring-yellow-400"), 2000);
                          }
                        }}
                      >
                        {match.name}
                      </button>
                    </p>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Price (KSh) *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Stock Qty</label>
                  <input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                    placeholder="100"
                    className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-medium">Availability</label>
                <select
                  value={formData.stock_status}
                  onChange={(e) => setFormData({ ...formData, stock_status: e.target.value as "in_stock" | "low_stock" | "out_of_stock" })}
                  className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-medium">
                  Barcode {!editingId ? <span className="text-primary">*</span> : <span className="text-muted-foreground">(optional for existing)</span>}
                </label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="e.g. 6001234567890"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setScanning(true)}
                    className="shrink-0 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    📷 Scan
                  </button>
                </div>
                {scanning && (
                  <BarcodeScanner
                    onScan={(barcode) => {
                      setFormData((prev) => ({ ...prev, barcode }));
                      setScanning(false);
                    }}
                    onClose={() => setScanning(false)}
                  />
                )}
                <p className="text-[10px] text-muted-foreground mt-0.5">EAN-13, EAN-8, or any barcode format. Leave blank if unknown.</p>
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-medium">Category</label>
                {(() => {
                  const isCatCustom =
                    formData.category === "__custom__" ||
                    (formData.category && !categories.includes(formData.category));
                  return (
                    <div className="space-y-1.5">
                      <select
                        value={isCatCustom ? "__custom__" : formData.category}
                        onChange={(e) => {
                          if (e.target.value === "__custom__") {
                            setFormData({ ...formData, category: "__custom__", subcategory: "" });
                            setCustomSubcategory("");
                          } else {
                            setFormData({ ...formData, category: e.target.value, subcategory: "" });
                            setCustomSubcategory("");
                            setCustomCategory("");
                          }
                        }}
                        className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        {/* Only owner/admin can create a brand-new category */}
                        {canManageCatalog && (
                          <option value="__custom__">+ Add new category…</option>
                        )}
                      </select>
                      {canManageCatalog && isCatCustom && (
                        <input
                          type="text"
                          value={customCategory}
                          onChange={(e) => {
                            setCustomCategory(e.target.value);
                            setFormData({ ...formData, category: e.target.value });
                          }}
                          placeholder="Type new category name"
                          className="w-full rounded-lg border border-primary bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        />
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Subcategory — owner/admin can add new; staff selects from existing only */}
              <div>
                <label className="text-xs text-muted-foreground font-medium">Subcategory</label>
                {(() => {
                  const configOpts = subcategoryConfig[formData.category] ?? [];
                  const liveOpts = products
                    .filter((p) => p.category === formData.category && p.subcategory)
                    .map((p) => p.subcategory as string);
                  const opts = [...new Set([...configOpts, ...liveOpts])];
                  const isCustom =
                    formData.subcategory === "__custom__" ||
                    (formData.subcategory && !opts.includes(formData.subcategory));
                  return (
                    <div className="space-y-1.5">
                      <select
                        value={isCustom ? "__custom__" : formData.subcategory}
                        onChange={(e) => {
                          if (e.target.value === "__custom__") {
                            setFormData({ ...formData, subcategory: "__custom__" });
                          } else {
                            setFormData({ ...formData, subcategory: e.target.value });
                            setCustomSubcategory("");
                          }
                        }}
                        className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">None</option>
                        {opts.map((sub) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                        {/* Staff can see a non-standard value set by owner but cannot change it */}
                        {!canManageCatalog && isCustom && formData.subcategory !== "__custom__" && (
                          <option value={formData.subcategory}>{formData.subcategory}</option>
                        )}
                        {/* Only owner/admin can create a brand-new subcategory */}
                        {canManageCatalog && (
                          <option value="__custom__">+ Add new subcategory…</option>
                        )}
                      </select>
                      {canManageCatalog && isCustom && (
                        <input
                          type="text"
                          value={customSubcategory}
                          onChange={(e) => {
                            setCustomSubcategory(e.target.value);
                            setFormData({ ...formData, subcategory: e.target.value });
                          }}
                          placeholder="Type new subcategory name"
                          className="w-full rounded-lg border border-primary bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        />
                      )}
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-medium">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Product description..."
                  rows={3}
                  className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Commission (KSh)</label>
                  <input
                    type="number"
                    value={formData.commission}
                    onChange={(e) => setFormData({ ...formData, commission: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Image Upload Section */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium block">Product Image</label>
                
                {/* Image Preview */}
                {imagePreview && (
                  <div className="relative w-full h-40 rounded-lg border border-border bg-secondary overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={clearImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* Upload Button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={imageUploading}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUploading}
                  className="w-full gap-2"
                >
                  {imageUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      {imagePreview ? "Change Image" : "Upload Image"}
                    </>
                  )}
                </Button>

                {/* Manual URL Input (Fallback) */}
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1">
                    Or paste image URL
                  </label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => {
                      setFormData({ ...formData, image_url: e.target.value });
                      setImagePreview(e.target.value);
                    }}
                    placeholder="https://example.com/image.jpg"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90">
                  {editingId ? "Update" : "Add"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Search & Filters */}
        {!showForm && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-card rounded-lg py-2.5 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary border border-border"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setStockFilter("all")}
                className={cn(
                  "text-sm rounded-full px-3 py-1.5 font-medium whitespace-nowrap transition-colors",
                  stockFilter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-muted"
                )}
              >
                All Stock
              </button>
              <button
                onClick={() => setStockFilter("in_stock")}
                className={cn(
                  "text-sm rounded-full px-3 py-1.5 font-medium whitespace-nowrap transition-colors",
                  stockFilter === "in_stock"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-muted"
                )}
              >
                In Stock
              </button>
              <button
                onClick={() => setStockFilter("low_stock")}
                className={cn(
                  "text-sm rounded-full px-3 py-1.5 font-medium whitespace-nowrap transition-colors",
                  stockFilter === "low_stock"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-muted"
                )}
              >
                Low Stock
              </button>
              <button
                onClick={() => setStockFilter("out_of_stock")}
                className={cn(
                  "text-sm rounded-full px-3 py-1.5 font-medium whitespace-nowrap transition-colors",
                  stockFilter === "out_of_stock"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-muted"
                )}
              >
                Out of Stock
              </button>
            </div>
          </>
        )}

        {/* Products List */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && filteredProducts.length === 0 && (
          <div className="bg-secondary rounded-xl p-6 text-center">
            <Package className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-muted-foreground font-medium">No products found</p>
          </div>
        )}

        <div className="space-y-2">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              id={`product-${p.id}`}
              className={cn(
                "bg-card rounded-lg p-3 card-elevated border flex items-start gap-3 transition-shadow"
              )}
            >
              {p.image_url && (
                <img
                  src={p.image_url}
                  alt={p.name}
                  className="w-16 h-16 rounded-lg object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground line-clamp-1">{p.name}</h3>
                <p className="text-sm text-muted-foreground">
                  KSh {p.price} · {p.category}{p.subcategory ? ` › ${p.subcategory}` : ""}
                </p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      getStockStatus(p.stock_quantity) === "in_stock"
                        ? "bg-primary/10 text-primary"
                        : getStockStatus(p.stock_quantity) === "low_stock"
                        ? "bg-yellow-500/10 text-yellow-700"
                        : "bg-destructive/10 text-destructive"
                    )}
                  >
                    {getStockStatus(p.stock_quantity) === "in_stock"
                      ? `${p.stock_quantity} in stock`
                      : getStockStatus(p.stock_quantity) === "low_stock"
                      ? `Low: ${p.stock_quantity}`
                      : "Out of stock"}
                  </span>
                  {p.is_offer && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600">
                      Special Offer
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleEdit(p)}
                  className="h-8 w-8"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => toggleVisibility(p.id, p.is_offer)}
                  className={cn("h-8 w-8", p.is_offer && "text-orange-600")}
                >
                  <Package className="w-4 h-4" />
                </Button>
                {customer?.is_admin && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteProduct(p.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ManageProducts;
