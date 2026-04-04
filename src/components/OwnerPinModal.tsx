import { useState, useEffect } from "react";
import { Lock, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOwnerPin } from "@/hooks/useOwnerPin";
import { toast } from "sonner";

// ── Verify Modal ───────────────────────────────────────────────────────────────

interface VerifyProps {
  actionLabel: string;
  onVerified: () => void;
  onCancel: () => void;
}

export function OwnerPinVerifyModal({ actionLabel, onVerified, onCancel }: VerifyProps) {
  const { verifyPin, getLockoutState } = useOwnerPin();
  const [pin, setPin] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Countdown ticker while locked out
  useEffect(() => {
    const ls = getLockoutState();
    if (!ls.locked) return;
    setSecondsLeft(ls.secondsLeft);
    const id = setInterval(() => {
      const s = getLockoutState();
      if (!s.locked) { setSecondsLeft(0); clearInterval(id); return; }
      setSecondsLeft(s.secondsLeft);
    }, 1000);
    return () => clearInterval(id);
  }, [getLockoutState]);

  const handleSubmit = async () => {
    if (pin.length !== 6) return;
    setBusy(true);
    setError(null);
    const result = await verifyPin(pin);
    setBusy(false);

    if (result === "ok") {
      onVerified();
      return;
    }
    setPin("");
    if (result === "wrong") {
      const ls = getLockoutState();
      const remaining = MAX_ATTEMPTS - (ls.locked ? 0 : 1);
      setError(`Incorrect PIN. ${remaining > 0 ? `${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.` : ""}`);
    } else if (result === "locked") {
      const ls = getLockoutState();
      setSecondsLeft(ls.secondsLeft);
      setError(`Too many attempts. Try again in ${ls.secondsLeft}s.`);
    } else if (result === "no_pin") {
      setError("No security PIN set. Please set one in your profile first.");
    } else {
      setError("Could not verify PIN. Check your connection.");
    }
  };

  const ls = getLockoutState();
  const locked = ls.locked;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4">
      <div className="bg-card rounded-xl w-full max-w-sm shadow-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">Owner Security PIN</p>
            <p className="text-xs text-muted-foreground">{actionLabel}</p>
          </div>
        </div>

        {locked ? (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            Too many wrong attempts. Please wait {secondsLeft}s before trying again.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <input
                value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }}
                type={show ? "text" : "password"}
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                autoFocus
                className="w-full bg-secondary rounded-lg py-3 px-4 pr-10 text-foreground text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                tabIndex={-1}
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button
            className="flex-1 bg-primary hover:bg-primary/90"
            onClick={handleSubmit}
            disabled={pin.length !== 6 || busy || locked}
          >
            {busy ? "Checking…" : "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
}

const MAX_ATTEMPTS = 3;

// ── Set / Change PIN section (used inside Profile) ─────────────────────────────

interface SetPinProps {
  hasPin: boolean;
  onSaved: () => void;
}

export function OwnerPinSetSection({ hasPin, onSaved }: SetPinProps) {
  const { setPin } = useOwnerPin();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const valid =
    (!hasPin || currentPin.length === 6) &&
    newPin.length === 6 &&
    confirmPin.length === 6 &&
    newPin === confirmPin;

  const handleSave = async () => {
    if (!valid) return;
    if (newPin !== confirmPin) {
      toast.error("PINs do not match.");
      return;
    }
    setBusy(true);
    const err = await setPin(newPin, hasPin ? currentPin : undefined);
    setBusy(false);
    if (err) {
      toast.error(err);
    } else {
      toast.success(hasPin ? "Security PIN changed." : "Security PIN set.");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      onSaved();
    }
  };

  const inputClass = "w-full bg-secondary rounded-lg py-2.5 px-3 text-foreground text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground";

  return (
    <div className="bg-card rounded-xl p-4 card-elevated border border-border space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground text-sm">
          {hasPin ? "Change Security PIN" : "Set Your Security PIN"}
        </h3>
      </div>
      <p className="text-xs text-muted-foreground">
        {hasPin
          ? "Enter your current PIN, then set a new 6-digit PIN."
          : "Set a 6-digit PIN to protect sensitive admin actions like price changes, staff management, and financial reports."}
      </p>

      <div className="space-y-2">
        {hasPin && (
          <div>
            <label className="text-xs text-muted-foreground font-medium">Current PIN</label>
            <input
              type={show ? "text" : "password"}
              inputMode="numeric"
              maxLength={6}
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              className={`${inputClass} mt-1`}
            />
          </div>
        )}
        <div>
          <label className="text-xs text-muted-foreground font-medium">{hasPin ? "New PIN" : "Enter PIN"}</label>
          <input
            type={show ? "text" : "password"}
            inputMode="numeric"
            maxLength={6}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••"
            className={`${inputClass} mt-1`}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-medium">Confirm PIN</label>
          <input
            type={show ? "text" : "password"}
            inputMode="numeric"
            maxLength={6}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••"
            className={`${inputClass} mt-1`}
          />
        </div>

        {newPin.length === 6 && confirmPin.length === 6 && newPin !== confirmPin && (
          <p className="text-xs text-destructive">PINs do not match.</p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="text-xs text-muted-foreground flex items-center gap-1"
          >
            {show ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {show ? "Hide" : "Show"} digits
          </button>
          <Button
            className="flex-1 bg-primary hover:bg-primary/90"
            onClick={handleSave}
            disabled={!valid || busy}
          >
            {busy ? "Saving…" : hasPin ? "Change PIN" : "Save PIN"}
          </Button>
        </div>
      </div>
    </div>
  );
}
