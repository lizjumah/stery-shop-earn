/**
 * Detects drift between category lists across the codebase.
 * Run with: npx vitest run src/test/categorySync.test.ts
 */
import { describe, it, expect } from "vitest";
import { subcategoryConfig, VALID_CATEGORIES, categories } from "../data/products";
import { SHOP_CATEGORIES } from "../data/categoryConfig";

describe("category sync", () => {
  it("VALID_CATEGORIES matches Object.keys(subcategoryConfig)", () => {
    expect(VALID_CATEGORIES.sort()).toEqual(Object.keys(subcategoryConfig).sort());
  });

  it("every SHOP_CATEGORIES db value is in VALID_CATEGORIES", () => {
    const unknown = SHOP_CATEGORIES.filter((c) => !VALID_CATEGORIES.includes(c.db));
    expect(unknown).toEqual([]);
  });

  it("categories filter array contains all official Stery catalogue categories", () => {
    const officialKeys = Object.keys(subcategoryConfig);
    const missing = officialKeys.filter((k) => !categories.includes(k) && k !== "All");
    expect(missing).toEqual([]);
  });
});
