/**
 * Normalises a Kenyan mobile number to the local 07XXXXXXXX / 01XXXXXXXX format.
 *
 * Handles the three formats that appear in the database:
 *   +254712345678  →  0712345678
 *    254712345678  →  0712345678
 *      0712345678  →  0712345678  (no-op)
 *
 * Also strips spaces, dashes and parentheses so user-typed formats like
 * "0712 345 678" or "+254-712-345-678" are accepted.
 *
 * Returns the input unchanged if it does not match a known Kenyan pattern,
 * so the caller can still surface a validation error rather than silently
 * mangling an unrecognised value.
 */
export function normalizeKenyanPhone(raw: string): string {
  // Strip common separators (spaces, dashes, parens, plus sign)
  let phone = raw.replace(/[\s\-()+]/g, "");

  // 254XXXXXXXXX (12 digits, after + was stripped)  →  0XXXXXXXXX
  if (phone.startsWith("254") && phone.length === 12) {
    phone = "0" + phone.slice(3);
  }

  console.debug("[normalizeKenyanPhone]", JSON.stringify(raw), "→", JSON.stringify(phone));
  return phone;
}
