import { useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, Phone, X, HelpCircle } from "lucide-react";

const WHATSAPP = "254794560657";
const CALL = "+254794560657";

const WHATSAPP_URL = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hi Stery, I need help with my order.")}`;
const CALL_URL = `tel:${CALL}`;

export const FloatingHelpButton = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Hide on all admin pages
  if (location.pathname.startsWith("/admin")) return null;

  return (
    <div className="fixed bottom-24 left-4 z-50 flex flex-col items-start gap-2">
      {open && (
        <>
          <a
            href={CALL_URL}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2.5 shadow-lg text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <Phone className="w-4 h-4 text-primary shrink-0" />
            Call Stery
          </a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2.5 shadow-lg text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-green-600 shrink-0" />
            WhatsApp Stery
          </a>
        </>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-full px-4 py-2.5 shadow-lg text-sm font-semibold active:scale-95 transition-transform"
        aria-label={open ? "Close help menu" : "Get help"}
      >
        {open ? <X className="w-4 h-4" /> : <HelpCircle className="w-4 h-4" />}
        {open ? "Close" : "Need help?"}
      </button>
    </div>
  );
};
