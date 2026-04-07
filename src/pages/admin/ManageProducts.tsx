import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { API_BASE } from "@/lib/api/client";
import { CsvImportModal } from "@/components/CsvImportModal";
import { BulkImageUploadModal } from "@/components/BulkImageUploadModal";
import { useProductManagement } from "@/hooks/useProductManagement";
import { useCustomer, getCustomerRole } from "@/contexts/CustomerContext";
import { useOwnerPinContext } from "@/contexts/OwnerPinContext";
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
  Images,
  FileDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ManageProducts = () => {
  const { products, isLoading, missingImageCount, fetchProducts, addProduct, updateProduct, deleteProduct, toggleVisibility } =
    useProductManagement();
  const { customer } = useCustomer();
  const { requireOwnerPin } = useOwnerPinContext();
  const { uploading: imageUploading, uploadImage } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subcategoryFilter, setSubcategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all");
  const [imageFilter, setImageFilter] = useState<"all" | "missing" | "has_image">("all");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [galleryImages, setGalleryImages] = useState<{ id: string; image_url: string }[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [showBulkImageUpload, setShowBulkImageUpload] = useState(false);

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

  // owner, product_manager, and legacy is_admin can manage catalog; staff cannot
  const canManageCatalog =
    getCustomerRole(customer) === "owner" ||
    getCustomerRole(customer) === "product_manager" ||
    customer?.is_admin === true;

  useEffect(() => {
    fetchProducts({ stock_status: stockFilter, category: categoryFilter || undefined, image_filter: imageFilter });
  }, [stockFilter, categoryFilter, imageFilter, fetchProducts]);

  // Reset subcategory selection whenever category changes
  useEffect(() => {
    setSubcategoryFilter("");
  }, [categoryFilter]);

  const BUILT_IN_CATEGORIES = [
    // official Stery catalogue
    "Beverages",
    "Food & Grocery",
    "Snacks & Confectionery",
    "Bakery",
    "Household & Cleaning",
    "Personal Care",
    "Kitchen & Utensils",
    "Stationery & School",
    "Fashion & Accessories",
    "Footwear",
    "Electronics",
    "Wines & Spirits",
    // legacy — kept so existing products' categories remain selectable
    "Groceries",
    "Household",
    "Baby Items",
    "Jewelry",
  ];
  const categories = [...new Set([...BUILT_IN_CATEGORIES, ...products.map((p) => p.category).filter(Boolean)])];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || formData.price <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Gate sensitive edits: price change or category change require owner PIN
    if (editingId) {
      const before = products.find((p) => p.id === editingId);
      const priceChanged = before && before.price !== formData.price;
      const categoryChanged = before && before.category !== formData.category;
      if (priceChanged || categoryChanged) {
        const label = [priceChanged && "price change", categoryChanged && "category change"]
          .filter(Boolean).join(" & ");
        const ok = await requireOwnerPin(`Confirm ${label}`);
        if (!ok) return;
      }
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

    const customerId = localStorage.getItem("stery_customer_id") || "";
    const auditHeaders = {
      "Content-Type": "application/json",
      "X-Customer-ID": customerId,
    };

    if (editingId) {
      // Capture before-state from the currently loaded products list
      const beforeProduct = products.find((p) => p.id === editingId) ?? null;
      const success = await updateProduct(editingId, formData);
      setEditingId(null);
      if (success) {
        // Fire-and-forget — audit failure must never block the UI action
        fetch(`${API_BASE}/api/admin/audit`, {
          method: "POST",
          headers: auditHeaders,
          body: JSON.stringify({
            action: "product_updated",
            entity_type: "product",
            entity_id: editingId,
            source: "admin_ui",
            before_data: beforeProduct
              ? {
                  name: beforeProduct.name,
                  barcode: beforeProduct.barcode ?? null,
                  price: beforeProduct.price,
                  category: beforeProduct.category,
                  subcategory: beforeProduct.subcategory ?? null,
                  stock_quantity: beforeProduct.stock_quantity,
                  stock_status: beforeProduct.stock_status ?? null,
                }
              : null,
            after_data: {
              name: formData.name,
              barcode: formData.barcode || null,
              price: formData.price,
              category: formData.category,
              subcategory: formData.subcategory || null,
              stock_quantity: formData.stock_quantity,
              stock_status: formData.stock_status,
            },
          }),
        }).catch(() => {});
      }
    } else {
      const newProduct = await addProduct(formData);
      if (newProduct) {
        // Fire-and-forget — audit failure must never block the UI action
        fetch(`${API_BASE}/api/admin/audit`, {
          method: "POST",
          headers: auditHeaders,
          body: JSON.stringify({
            action: "product_created",
            entity_type: "product",
            entity_id: newProduct.id,
            source: "admin_ui",
            after_data: {
              name: newProduct.name,
              barcode: newProduct.barcode ?? null,
              price: newProduct.price,
              category: newProduct.category,
              subcategory: newProduct.subcategory ?? null,
              stock_quantity: newProduct.stock_quantity,
              stock_status: newProduct.stock_status ?? null,
            },
          }),
        }).catch(() => {});
      }
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
    setGalleryImages([]);
    setEditingId(p.id);
    setShowForm(true);
    loadGalleryImages(p.id);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setImagePreview("");
    setGalleryImages([]);
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

  const loadGalleryImages = async (productId: string) => {
    try {
      const customerId = localStorage.getItem("stery_customer_id") || "";
      const res = await fetch(`${API_BASE}/api/admin/products/${productId}/images`, {
        headers: { "X-Customer-ID": customerId },
      });
      if (res.ok) {
        const json = await res.json();
        setGalleryImages(json.images ?? []);
      }
    } catch {
      // non-fatal — gallery just shows empty
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingId) return;
    setGalleryUploading(true);
    try {
      const customerId = localStorage.getItem("stery_customer_id") || "";
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`${API_BASE}/api/admin/products/${editingId}/images`, {
        method: "POST",
        headers: { "X-Customer-ID": customerId },
        body,
      });
      if (!res.ok) throw new Error("Upload failed");
      await loadGalleryImages(editingId);
      toast.success("Gallery image added.");
    } catch {
      toast.error("Failed to upload gallery image.");
    } finally {
      setGalleryUploading(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  const handleGalleryDelete = async (imageId: string) => {
    if (!editingId) return;
    try {
      const customerId = localStorage.getItem("stery_customer_id") || "";
      const res = await fetch(`${API_BASE}/api/admin/products/images/${imageId}`, {
        method: "DELETE",
        headers: { "X-Customer-ID": customerId },
      });
      if (!res.ok) throw new Error("Delete failed");
      setGalleryImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch {
      toast.error("Failed to remove gallery image.");
    }
  };

  const getStockStatus = (qty: number) => {
    if (qty === 0) return "out_of_stock";
    if (qty <= 10) return "low_stock";
    return "in_stock";
  };

  const subcategoryOptions = categoryFilter ? (subcategoryConfig[categoryFilter] ?? []) : [];

  const filteredProducts = products.filter((p) => {
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (categoryFilter && p.category !== categoryFilter) return false;
    if (subcategoryFilter && (p.subcategory || "") !== subcategoryFilter) return false;
    return true;
  });

  const handleExport = () => {
    if (filteredProducts.length === 0) {
      toast.error("No products to export.");
      return;
    }
    const rows = filteredProducts.map((p) => ({
      "Product Name": p.name,
      "Barcode": p.barcode ?? "",
      "Category": p.category,
      "Subcategory": p.subcategory ?? "",
      "Price (KSh)": p.price,
      "Cost Price (KSh)": p.original_price ?? "",
      "Stock": p.stock_quantity,
      "Image Status": p.image_url ? "Has Image" : "Missing",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    const label = imageFilter === "missing" ? "missing-images"
      : imageFilter === "has_image" ? "has-images"
      : "all";
    XLSX.writeFile(wb, `stery-products-${label}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <ShopHeader title="Manage Products" showBack />

      <div className="px-4 py-6 space-y-4">
        {/* Add Product Button */}
        {!showForm && (
          <div className="flex gap-2">
            <Button
              onClick={() => setShowForm(true)}
              className="flex-1 bg-primary hover:bg-primary/90 h-12 gap-2"
            >
              <Plus className="w-5 h-5" />
              Add New Product
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCsvImport(true)}
              className="h-12 gap-2 px-4"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </Button>
            {canManageCatalog && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowBulkImageUpload(true)}
                className="h-12 gap-2 px-4"
              >
                <Images className="w-4 h-4" />
                Bulk Images
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleExport}
              className="h-12 gap-2 px-4"
            >
              <FileDown className="w-4 h-4" />
              Export Excel
            </Button>
          </div>
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
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="e.g. 6001234567890"
                  className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
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

              {/* Gallery Images — only available when editing an existing product */}
              {editingId && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground font-medium block">
                    Gallery Images
                    {["Shoes", "Fashion & Accessories", "Footwear"].includes(formData.category) && (
                      <span className="ml-1 text-primary">(recommended for this category)</span>
                    )}
                  </label>

                  {/* Existing gallery thumbnails */}
                  {galleryImages.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {galleryImages.map((img) => (
                        <div key={img.id} className="relative w-20 h-20 rounded-lg border border-border overflow-hidden">
                          <img src={img.image_url} alt="Gallery" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleGalleryDelete(img.id)}
                            className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs leading-none hover:bg-destructive/80"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add gallery image button */}
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleGalleryUpload}
                    disabled={galleryUploading}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={galleryUploading}
                    className="w-full gap-2 border-dashed"
                  >
                    {galleryUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading…
                      </>
                    ) : (
                      <>
                        <Images className="w-4 h-4" />
                        Add Gallery Image
                      </>
                    )}
                  </Button>
                </div>
              )}

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
            {/* Search bar */}
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

            {/* Category + Subcategory dropdowns + count */}
            <div className="flex gap-2 flex-wrap items-center">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="flex-1 min-w-[140px] rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={subcategoryFilter}
                onChange={(e) => setSubcategoryFilter(e.target.value)}
                disabled={!categoryFilter || subcategoryOptions.length === 0}
                className="flex-1 min-w-[140px] rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="">All Subcategories</option>
                {subcategoryOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              {/* Image Status filter */}
              <select
                value={imageFilter}
                onChange={(e) => setImageFilter(e.target.value as "all" | "missing" | "has_image")}
                className="flex-1 min-w-[140px] rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Products</option>
                <option value="missing">Missing Images</option>
                <option value="has_image">Has Images</option>
              </select>

              {/* Product count + missing count */}
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                  {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}
                  {categoryFilter ? ` in ${categoryFilter}` : ""}
                </span>
                {missingImageCount > 0 && (
                  <span className="text-xs text-amber-600 font-medium whitespace-nowrap">
                    Missing Images: {missingImageCount}
                  </span>
                )}
              </div>
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
                  {!p.category && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-700">
                      ⚠ No Category
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
                    onClick={async () => {
                      const ok = await requireOwnerPin(`Delete "${p.name}"`);
                      if (ok) deleteProduct(p.id);
                    }}
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

      {showCsvImport && (
        <CsvImportModal
          customerId={customer?.id ?? ""}
          onClose={() => setShowCsvImport(false)}
          onImported={() => fetchProducts({ stock_status: stockFilter, category: categoryFilter || undefined })}
        />
      )}
      {showBulkImageUpload && (
        <BulkImageUploadModal
          onClose={() => setShowBulkImageUpload(false)}
          onComplete={() => fetchProducts({ stock_status: stockFilter, category: categoryFilter || undefined })}
        />
      )}
    </div>
  );
};

export default ManageProducts;
