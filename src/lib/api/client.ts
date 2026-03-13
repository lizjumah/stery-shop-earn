/**
 * Central API client for the Stery backend.
 *
 * All admin API calls must go through this module.
 * Never hardcode backend URLs elsewhere — always import from here.
 *
 * In production: set VITE_BACKEND_URL=https://stery-backend.onrender.com in Vercel env vars.
 * In development: set VITE_BACKEND_URL=http://localhost:3000 in .env.
 */

export const API_BASE: string = import.meta.env.VITE_BACKEND_URL ?? "";

// Warn loudly in production if the env var is missing — silent failures are worse.
if (!API_BASE && import.meta.env.PROD) {
  console.error(
    "[Stery] VITE_BACKEND_URL is not set. " +
      "Admin API calls will fail. " +
      "Add VITE_BACKEND_URL to your Vercel environment variables."
  );
}

/** Returns the standard admin request headers, pulling the session ID from localStorage. */
export function getAdminHeaders(): Record<string, string> {
  const customerId = localStorage.getItem("stery_customer_id") ?? "";
  return {
    "Content-Type": "application/json",
    "X-Customer-ID": customerId,
  };
}

/**
 * Shared admin fetch utility used by all admin hooks and pages.
 * Automatically attaches auth header, parses JSON, and throws on non-2xx responses.
 */
export async function adminFetch(
  path: string,
  method: string,
  body?: object
): Promise<any> {
  const res = await fetch(`${API_BASE}/api/admin${path}`, {
    method,
    headers: getAdminHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error ?? json.message ?? `HTTP ${res.status}`);
  }
  return json;
}
