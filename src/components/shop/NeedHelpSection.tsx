import { MessageCircle, ChevronRight } from "lucide-react";

export const NeedHelpSection = () => {
  const handleWhatsApp = () => {
    const msg = encodeURIComponent("Hi Stery, I need help with my order.");
    window.open(`https://wa.me/254794560657?text=${msg}`, "_blank");
  };

  return (
    <div className="mb-4">
      <button
        onClick={handleWhatsApp}
        className="w-full bg-card rounded-xl p-4 card-elevated flex items-center gap-4 border border-border hover:border-primary/30 transition-colors"
      >
        <div className="bg-accent/10 rounded-full p-3">
          <MessageCircle className="w-6 h-6 text-accent" />
        </div>
        <div className="text-left flex-1">
          <h3 className="font-semibold text-foreground">Need Help?</h3>
          <p className="text-sm text-muted-foreground">Chat with Stery support on WhatsApp</p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </button>
    </div>
  );
};
