interface Props {
  onConfirm: () => void;
  onExit: () => void;
}

/**
 * Age verification modal for Wines & Spirits category.
 * Confirmation is stored in sessionStorage ("stery_age_confirmed").
 * The modal uses fixed positioning so it renders over the entire viewport
 * regardless of where in the component tree it is mounted.
 */
export function AgeGateModal({ onConfirm, onExit }: Props) {
  // Prevent any click inside the modal from bubbling to parent elements (e.g. <Link>)
  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={stop}
    >
      <div className="bg-card rounded-xl w-full max-w-sm shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-4 flex items-center gap-3">
          <span className="text-2xl" aria-hidden>🍷</span>
          <h2 className="font-bold text-foreground text-base">Age Restricted Products</h2>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-5">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Alcohol products are sold only to persons aged{" "}
            <strong className="text-foreground">18 years and above</strong>.
            Please confirm that you meet the legal age requirement.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            By proceeding, you confirm that you are 18 years or older and legally
            allowed to view and purchase these products.
          </p>

          <div className="space-y-2">
            <button
              onClick={(e) => { stop(e); onConfirm(); }}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Yes, I am 18+
            </button>
            <button
              onClick={(e) => { stop(e); onExit(); }}
              className="w-full py-3 rounded-lg border border-border text-muted-foreground font-medium text-sm hover:bg-secondary transition-colors"
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
