import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

const SCANNER_DIV_ID = "barcode-scanner-region";

export const BarcodeScanner = ({ onScan, onClose }: BarcodeScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const didScan = useRef(false);

  useEffect(() => {
    const scanner = new Html5Qrcode(SCANNER_DIV_ID);
    scannerRef.current = scanner;

    Html5Qrcode.getCameras()
      .then((cameras) => {
        if (!cameras.length) throw new Error("No camera found");

        return scanner.start(
          { facingMode: "environment" }, // prefer rear camera on mobile
          { fps: 10, qrbox: { width: 260, height: 120 } },
          (decodedText) => {
            if (didScan.current) return; // ignore extra frames after first hit
            didScan.current = true;
            scanner.stop().catch(() => {});
            onScan(decodedText);
          },
          undefined // per-frame decode errors are normal — suppress them
        );
      })
      .catch(() => {
        toast.error("Camera unavailable. Please enter barcode manually.");
        onClose();
      });

    return () => {
      // Cleanup on unmount — stop camera regardless of scan state
      scannerRef.current?.stop().catch(() => {});
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = () => {
    scannerRef.current?.stop().catch(() => {});
    onClose();
  };

  return (
    <div className="mt-2 rounded-lg border border-border overflow-hidden bg-background">
      {/* html5-qrcode mounts the video stream into this div */}
      <div id={SCANNER_DIV_ID} className="w-full" />
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleCancel}
        className="w-full rounded-none border-0 border-t border-border gap-1.5 text-xs"
      >
        <X className="w-3 h-3" /> Cancel Scan
      </Button>
    </div>
  );
};
