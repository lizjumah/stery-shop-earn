import React, { useState } from "react";
import { ShopHeader } from "@/components/ShopHeader";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle, AlertCircle, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations";

interface ImportResult {
  total: number;
  imported: number;
  failed: number;
  errors: string[];
}

const BulkProductImport = () => {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [csvContent, setCsvContent] = useState("");

  const downloadTemplate = () => {
    const template = `name,price,category,description,commission,stock_quantity,image_url
Fresh Tomatoes,150,Vegetables,Ripe red tomatoes fresh from farm,10,50,https://example.com/tomato.jpg
Maize Meal,80,Grains,Quality maize meal 2kg bag,5,100,https://example.com/maize.jpg`;

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
    const headers = lines[0].split(",").map((h) => h.trim());
    const products = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(",").map((v) => v.trim());
        if (values.length < 7 || values.every((v) => !v)) continue;

        const product = {
          name: values[0],
          price: parseFloat(values[1]),
          category: values[2],
          description: values[3],
          commission: parseFloat(values[4]),
          stock_quantity: parseInt(values[5]),
          image_url: values[6],
        };

        if (!product.name || !product.price || !product.category) {
          errors.push(`Row ${i + 1}: Missing required fields`);
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

    let imported = 0;
    const importErrors = [...errors];

    try {
      for (const product of products) {
        try {
          // Insert product
          const { error } = await supabase.from("products").insert([
            {
              name: product.name,
              price: product.price,
              category: product.category,
              description: product.description,
              commission_percent: product.commission,
              stock_quantity: product.stock_quantity,
              image_url: product.image_url,
              visibility: "visible",
            },
          ]);

          if (error) {
            importErrors.push(`${product.name}: ${error.message}`);
          } else {
            imported++;
          }
        } catch (err) {
          importErrors.push(`${product.name}: Failed to import`);
        }
      }

      setResult({
        total: products.length,
        imported,
        failed: products.length - imported + errors.length,
        errors: importErrors,
      });

      // Reset after 2 seconds
      setTimeout(() => {
        setCsvContent("");
      }, 2000);
    } catch (err) {
      setResult({
        total: products.length,
        imported: 0,
        failed: products.length,
        errors: ["Import failed"],
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
            Upload a CSV file with columns: name, price, category, description,
            commission, stock_quantity, image_url
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
                {result.imported} of {result.total} products imported
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <MetricBox label="Total" value={result.total.toString()} />
              <MetricBox
                label="Imported"
                value={result.imported.toString()}
                color="text-green-600"
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
