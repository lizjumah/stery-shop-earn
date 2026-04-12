/**
 * Referral code persistence — localStorage only.
 *
 * When a customer lands on any page with ?ref=CODE the code is
 * stored here. Checkout reads it and attaches it to the order.
 * The code is cleared after the order is placed so it is only
 * credited once.
 */

const KEY = "stery_ref";

export function storeReferralCode(code: string) {
  if (code && code.trim()) {
    localStorage.setItem(KEY, code.trim().toUpperCase());
  }
}

export function getStoredReferralCode(): string | null {
  return localStorage.getItem(KEY) || null;
}

export function clearStoredReferralCode() {
  localStorage.removeItem(KEY);
}
