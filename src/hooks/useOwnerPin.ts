import { useCallback, useRef } from "react";
import { API_BASE, getAdminHeaders } from "@/lib/api/client";

// In-memory PIN verification session — intentionally NOT persisted to localStorage.
// Cleared on page refresh which is the correct security behaviour.
interface PinSession {
  token: string;
  expiresAt: number;
}

let _session: PinSession | null = null;

// Lockout state — also in-memory only.
interface LockoutState {
  attempts: number;
  lockedUntil: number | null;
}
const _lockout: LockoutState = { attempts: 0, lockedUntil: null };

const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

export function useOwnerPin() {
  // pendingResolve holds the resolve callback while a verify dialog is open.
  // The modal calls verifyPin(), which resolves/rejects it.
  const pendingResolveRef = useRef<((verified: boolean) => void) | null>(null);

  /** Returns true if the current session token is still valid. */
  const isVerified = useCallback((): boolean => {
    if (!_session) return false;
    if (Date.now() > _session.expiresAt) {
      _session = null;
      return false;
    }
    return true;
  }, []);

  /**
   * Returns lockout info for UI display.
   * { locked: boolean, secondsLeft: number }
   */
  const getLockoutState = useCallback(() => {
    if (_lockout.lockedUntil && Date.now() < _lockout.lockedUntil) {
      return { locked: true, secondsLeft: Math.ceil((_lockout.lockedUntil - Date.now()) / 1000) };
    }
    if (_lockout.lockedUntil && Date.now() >= _lockout.lockedUntil) {
      _lockout.lockedUntil = null;
      _lockout.attempts = 0;
    }
    return { locked: false, secondsLeft: 0 };
  }, []);

  /**
   * Verifies PIN against the backend. Returns one of:
   *   "ok"       — correct PIN, session stored
   *   "wrong"    — wrong PIN (attempts tracked)
   *   "locked"   — too many attempts, cooldown active
   *   "error"    — network/server error
   *   "no_pin"   — owner hasn't set a PIN yet
   */
  const verifyPin = useCallback(async (pin: string): Promise<"ok" | "wrong" | "locked" | "error" | "no_pin"> => {
    const ls = getLockoutState();
    if (ls.locked) return "locked";

    try {
      const res = await fetch(`${API_BASE}/api/admin/owner-pin/verify`, {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({ pin }),
      });
      const json = await res.json().catch(() => ({}));

      if (res.status === 400 && json.error?.includes("No security PIN")) return "no_pin";

      if (res.status === 401) {
        _lockout.attempts++;
        if (_lockout.attempts >= MAX_ATTEMPTS) {
          _lockout.lockedUntil = Date.now() + LOCKOUT_MS;
          _lockout.attempts = 0;
          return "locked";
        }
        return "wrong";
      }

      if (!res.ok) return "error";

      _session = { token: json.token, expiresAt: json.expiresAt };
      _lockout.attempts = 0;
      _lockout.lockedUntil = null;
      return "ok";
    } catch {
      return "error";
    }
  }, [getLockoutState]);

  /**
   * Sets or changes the owner PIN via the backend.
   * Returns null on success, or an error string.
   */
  const setPin = useCallback(async (pin: string, currentPin?: string): Promise<string | null> => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/owner-pin/set`, {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({ pin, currentPin }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return json.error ?? "Failed to save PIN.";
      return null;
    } catch {
      return "Network error. Please try again.";
    }
  }, []);

  /**
   * Fetches whether the current user has a PIN set.
   */
  const fetchPinStatus = useCallback(async (): Promise<{ hasPin: boolean; isOwner: boolean }> => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/owner-pin/status`, {
        headers: getAdminHeaders(),
      });
      if (!res.ok) return { hasPin: false, isOwner: false };
      return res.json();
    } catch {
      return { hasPin: false, isOwner: false };
    }
  }, []);

  return { isVerified, verifyPin, setPin, fetchPinStatus, getLockoutState, pendingResolveRef };
}
