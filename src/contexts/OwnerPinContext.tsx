/**
 * OwnerPinContext
 *
 * Provides `requireOwnerPin(actionLabel)` — returns a Promise<boolean>.
 * If the session is already verified (within 10 min) it resolves immediately.
 * Otherwise it mounts the verify modal and waits for the user to confirm or cancel.
 *
 * Usage:
 *   const { requireOwnerPin } = useOwnerPinContext();
 *   const ok = await requireOwnerPin("Change product price");
 *   if (!ok) return;
 *   // proceed with sensitive action
 */
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useOwnerPin } from "@/hooks/useOwnerPin";
import { OwnerPinVerifyModal } from "@/components/OwnerPinModal";
import { getCustomerRole } from "@/contexts/CustomerContext";
import { useCustomer } from "@/contexts/CustomerContext";

interface OwnerPinContextType {
  requireOwnerPin: (actionLabel: string) => Promise<boolean>;
}

const OwnerPinContext = createContext<OwnerPinContextType>({
  requireOwnerPin: async () => true, // non-owner callers always pass through
});

export function OwnerPinProvider({ children }: { children: ReactNode }) {
  const { customer } = useCustomer();
  const { isVerified } = useOwnerPin();
  const [modal, setModal] = useState<{ label: string; resolve: (v: boolean) => void } | null>(null);

  const requireOwnerPin = useCallback(async (actionLabel: string): Promise<boolean> => {
    // Only gate owner accounts — staff/product_manager have no owner_pin
    if (getCustomerRole(customer) !== "owner") return true;
    // Already verified within the 10-min window
    if (isVerified()) return true;

    return new Promise<boolean>((resolve) => {
      setModal({ label: actionLabel, resolve });
    });
  }, [customer, isVerified]);

  const handleVerified = useCallback(() => {
    modal?.resolve(true);
    setModal(null);
  }, [modal]);

  const handleCancel = useCallback(() => {
    modal?.resolve(false);
    setModal(null);
  }, [modal]);

  return (
    <OwnerPinContext.Provider value={{ requireOwnerPin }}>
      {children}
      {modal && (
        <OwnerPinVerifyModal
          actionLabel={modal.label}
          onVerified={handleVerified}
          onCancel={handleCancel}
        />
      )}
    </OwnerPinContext.Provider>
  );
}

export function useOwnerPinContext() {
  return useContext(OwnerPinContext);
}
