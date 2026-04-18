import React, { useState } from "react";
import { ShopHeader } from "@/components/ShopHeader";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle, AlertCircle, Loader2, Download } from "lucide-react";
import { API_BASE } from "@/lib/api/client";
import { VALID_CATEGORIES } from "@/data/products";

interface ImportResult {
  total: number;
  imported: number;
  updatedExisting: number;
  failed: number;
  errors: string[];
}

const resolveHeader = (raw: string) => {
  const h = raw.trim().toLowerCase().replace(/[-_ ]+/g, " ");
  if (h === "name" || h === "product name" || h === "product") return "name";
  if (h === "barcode" || h === "ean" || h === "sku") return "barcode";
  if (h === "price" || h === "selling price" || h === "unit price") return "price";
  if (h === "stock" || h === "quantity" || h === "qty" || h === "stock quantity") return "stock";
  if (h === "category" || h === "department") return "category";
  if (h === "subcategory" || h === "sub category" || h === "sub-category") return "subcategory";
  return h;
};

const BulkProductImport = () => {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [csvContent, setCsvContent] = useState("");

  const downloadTemplate = () => {
    const template = `name,barcode,price,stock,category,subcategory
Fresh Tomatoes,2123456789012,150,50,Food & Grocery,General
Canvas Shoes,3123456789012,1800,12,Shoes,General`;

    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/csv;charset=utf-8," + encodeURIComponent(template)
    );
    element.setAttribute("download", "products_template.csv");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
    };
    reader.readAsText(file);
  };

  const parseCSV = (csv: string) => {
    const lines = csv.trim().split("\n");
    const headers = lines[0].split(",").map(resolveHeader);
    const products = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(",").map((v) => v.trim());
        if (values.every((v) => !v)) continue;

        const fields: Record<string, string> = {};
        headers.forEach((header, idx) => {
          fields[header] = values[idx] ?? "";
        });

        const product = {
          name: fields.name,
          barcode: fields.barcode?.trim() || undefined,
          price: parseFloat(fields.price),
          stock: parseInt(fields.stock || "0", 10),
          category: fields.category,
          subcategory: fields.subcategory || undefined,
        };

        if (!product.name || !product.price) {
          errors.push(`Row ${i + 1}: Missing required fields`);
          continue;
        }

        // Reject names that are numeric or scientific notation (e.g. "6.164E+12").
        if (/^[0-9.]+([Ee][+\-][0-9]+)?$/.test(product.name)) {
          errors.push(`Row ${i + 1}: Name looks like a number or barcode ("${product.name}") — check column order`);
          continue;
        }

        if (!product.barcode) {
          errors.push(`Row ${i + 1}: Barcode is required`);
          continue;
        }

        const rawCat = (fields.category || "").trim();
        if (!rawCat) {
          errors.push(`Row ${i + 1}: Category is required for product: "${product.name}"`);
          continue;
        }
        if (!VALID_CATEGORIES.includes(rawCat)) {
          errors.push(`Row ${i + 1}: Category not found for product: "${product.name}". CSV value: "${rawCat}"`);
          continue;
        }

        products.push(product);
      } catch (err) {
        errors.push(`Row ${i + 1}: Parse error`);
      }
    }

    return { products, errors };
  };

  const handleImport = async () => {
    if (!csvContent.trim()) return;

    setImporting(true);
    const { products, errors } = parseCSV(csvContent);

    const importErrors = [...errors];

    try {
      const customerId = localStorage.getItem("stery_customer_id") || "";
      const res = await fetch(`${API_BASE}/api/admin/products/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Customer-ID": customerId,
        },
        body: JSON.stringify({ rows: products }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || `HTTP ${res.status}`);
      }

      setResult({
        total: products.length,
        imported: json.imported ?? 0,
        updatedExisting: json.updatedExisting ?? 0,
        failed: (json.skippedErrors ?? 0) + errors.length,
        errors: [...importErrors, ...(json.errors ?? [])],
      });

      // Reset after 2 seconds
      setTimeout(() => {
        setCsvContent("");
      }, 2000);
    } catch (err) {
      setResult({
        total: products.length,
        imported: 0,
        updatedExisting: 0,
        failed: products.length,
        errors: [...importErrors, "Import failed"],
      });
    }

    setImporting(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <ShopHeader title="Bulk Product Import" showBack />

      <div className="px-4 py-6 space-y-6">
        {/* Info Box */}
        <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
          <p className="text-sm text-foreground font-medium">CSV Format Required</p>
          <p className="text-xs text-muted-foreground mt-1">
            Upload a CSV file with columns like: name, barcode, price, stock, category, subcategory
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={downloadTemplate}
            className="mt-3 text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-2" />
            Download Template
          </Button>
        </div>

        {/* File Upload */}
        {!result && (
          <div>
            <label className="block">
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="font-medium text-foreground mb-1">Choose CSV file</p>
                <p className="text-xs text-muted-foreground">or drag and drop</p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </label>

            {csvContent && (
              <div className="mt-4 space-y-3">
                <div className="bg-secondary rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Preview:</p>
                  <p className="text-sm font-mono text-foreground truncate max-h-20 overflow-auto">
                    {csvContent.split("\n").slice(0, 3).join("\n")}
                  </p>
                </div>

                <Button
                  onClick={handleImport}
                  disabled={importing}
                  className="w-full bg-primary hover:bg-primary/90"
                  size="lg"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Start Import
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <div
              className={`rounded-xl p-6 text-center ${
                result.failed === 0
                  ? "bg-green-500/10 border border-green-500/20"
                  : "bg-yellow-500/10 border border-yellow-500/20"
              }`}
            >
              {result.failed === 0 ? (
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              ) : (
                <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
              )}
              <h3 className="font-bold text-lg text-foreground mb-1">Import Complete</h3>
              <p className="text-muted-foreground text-sm">
                {result.imported} imported, {result.updatedExisting} updated from {result.total} rows
              </p>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <MetricBox label="Total" value={result.total.toString()} />
              <MetricBox
                label="Imported"
                value={result.imported.toString()}
                color="text-green-600"
              />
              <MetricBox
                label="Updated"
                value={result.updatedExisting.toString()}
                color="text-blue-600"
              />
              <MetricBox
                label="Failed"
                value={result.failed.toString()}
                color={result.failed > 0 ? "text-destructive" : "text-muted-foreground"}
              />
            </div>

            {result.errors.length > 0 && (
              <div className="bg-card rounded-xl p-4 border">
                <h4 className="font-bold text-foreground mb-3">Errors</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {result.errors.map((error, idx) => (
                    <div key={idx} className="text-xs text-muted-foreground">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={() => {
                setResult(null);
                setCsvContent("");
              }}
              variant="outline"
              size="lg"
              className="w-full"
            >
              Import Another File
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

interface MetricBoxProps {
  label: string;
  value: string;
  color?: string;
}

const MetricBox: React.FC<MetricBoxProps> = ({ label, value, color = "text-foreground" }) => (
  <div className="bg-card rounded-lg p-3 border text-center">
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    <p className={`font-bold text-lg ${color}`}>{value}</p>
  </div>
);

export default BulkProductImport;
