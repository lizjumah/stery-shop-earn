import { useRef, useState } from "react";
import { X, Images, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/api/client";

interface BulkUploadResult {
  matched: number;
  unmatched: number;
  failed: number;
  unmatched_filenames: string[];
}

interface Props {
  onClose: () => void;
  onComplete: () => void;
}

const ACCEPTED_TYPES = ".jpg,.jpeg,.png,.webp";
const MAX_FILES = 200;

export function BulkImageUploadModal({ onClose, onComplete }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > MAX_FILES) {
      setErrorMsg(`Maximum ${MAX_FILES} files allowed per upload.`);
      setSelectedFiles([]);
      return;
    }
    setErrorMsg(null);
    setResult(null);
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const customerId = localStorage.getItem("stery_customer_id") || "";
      const formData = new FormData();
      for (const file of selectedFiles) {
        formData.append("images", file);
      }

      const res = await fetch(`${API_BASE}/api/admin/products/bulk-images`, {
        method: "POST",
        headers: { "X-Customer-ID": customerId },
        body: formData,
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.message ?? json.error ?? `HTTP ${res.status}`);
      }

      setResult({
        matched: json.matched ?? 0,
        unmatched: json.unmatched ?? 0,
        failed: json.failed ?? 0,
        unmatched_filenames: json.unmatched_filenames ?? [],
      });

      if ((json.matched ?? 0) > 0) {
        onComplete();
      }
    } catch (err: any) {
      setErrorMsg(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setSelectedFiles([]);
    setResult(null);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4">
      <div className="bg-card rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Images className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Bulk Image Upload</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Instructions */}
          <div className="bg-secondary/50 rounded-lg px-4 py-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground text-sm">How it works</p>
            <p>Filename (without extension) must match a product's barcode.</p>
            <p className="font-mono bg-background rounded px-2 py-1 text-xs mt-1">
              61611007.jpg → barcode 61611007
            </p>
            <p className="mt-1">
              Only <strong>image_url</strong> is updated. No other field is changed.
            </p>
          </div>

          {/* File picker */}
          {!result && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                multiple
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full gap-2"
                >
                  <Images className="w-4 h-4" />
                  {selectedFiles.length > 0
                    ? `${selectedFiles.length} file${selectedFiles.length !== 1 ? "s" : ""} selected — change`
                    : "Choose Images"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  .jpg, .jpeg, .png, .webp · max {MAX_FILES} files · 5 MB each
                </p>
              </div>

              {errorMsg && (
                <p className="text-sm text-destructive flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                </p>
              )}

              {selectedFiles.length > 0 && (
                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full bg-primary hover:bg-primary/90 gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading {selectedFiles.length} image{selectedFiles.length !== 1 ? "s" : ""}…
                    </>
                  ) : (
                    <>
                      <Images className="w-4 h-4" />
                      Upload {selectedFiles.length} Image{selectedFiles.length !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              )}
            </>
          )}

          {/* Result summary */}
          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-green-500/10 rounded-lg px-3 py-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-green-700">{result.matched}</p>
                  <p className="text-xs text-green-700 font-medium">Matched</p>
                </div>
                <div className={`rounded-lg px-3 py-3 ${result.unmatched > 0 ? "bg-amber-500/10" : "bg-secondary/50"}`}>
                  <p className={`text-2xl font-bold ${result.unmatched > 0 ? "text-amber-700" : "text-muted-foreground"}`}>
                    {result.unmatched}
                  </p>
                  <p className={`text-xs font-medium ${result.unmatched > 0 ? "text-amber-700" : "text-muted-foreground"}`}>
                    Unmatched
                  </p>
                </div>
                <div className={`rounded-lg px-3 py-3 ${result.failed > 0 ? "bg-destructive/10" : "bg-secondary/50"}`}>
                  <p className={`text-2xl font-bold ${result.failed > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {result.failed}
                  </p>
                  <p className={`text-xs font-medium ${result.failed > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    Failed
                  </p>
                </div>
              </div>

              {result.unmatched_filenames.length > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-3 space-y-1">
                  <p className="text-xs font-semibold text-amber-700">
                    Unmatched files — no product with this barcode:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-0.5 max-h-32 overflow-y-auto">
                    {result.unmatched_filenames.slice(0, 50).map((name) => (
                      <li key={name} className="font-mono">{name}</li>
                    ))}
                    {result.unmatched_filenames.length > 50 && (
                      <li className="text-muted-foreground italic">
                        … and {result.unmatched_filenames.length - 50} more
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={reset}
                  className="flex-1"
                >
                  Upload More
                </Button>
                <Button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
