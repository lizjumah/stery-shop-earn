/**
 * Commission calculation — single source of truth.
 *
 * Rules (in priority order):
 *  1. product.commission set and > 0  → use it directly
 *  2. category === "Electronics"      → 5% of price
 *  3. everything else                 → 10% of price
 *
 * Result is always rounded to the nearest integer (KSh).
 */
export function calcCommission(price: number, category: string, commission?: number | null): number {
  if (commission != null && commission > 0) return Math.round(commission);
  const rate = category === "Electronics" ? 0.05 : 0.1;
  return Math.round(price * rate);
}
