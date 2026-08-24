import { describe, expect, it } from "vitest";

import { DEFAULT_ECOMMERCE_COUNTS, ecommerceCountTotal, normalizeEcommerceCounts } from "./ecommerce-contract";

describe("ecommerce counts", () => {
    it("uses the documented defaults", () => {
        expect(DEFAULT_ECOMMERCE_COUNTS).toEqual({ square: 1, pageMain: 5, detail: 10 });
        expect(ecommerceCountTotal(DEFAULT_ECOMMERCE_COUNTS)).toBe(16);
    });

    it("accepts zero per category while requiring a valid total", () => {
        expect(normalizeEcommerceCounts({ square: 0, pageMain: 1, detail: 0 })).toEqual({ square: 0, pageMain: 1, detail: 0 });
        expect(() => normalizeEcommerceCounts({ square: 0, pageMain: 0, detail: 0 })).toThrow("1–40");
        expect(() => normalizeEcommerceCounts({ square: 41, pageMain: 0, detail: 0 })).toThrow("0–40");
    });
});
