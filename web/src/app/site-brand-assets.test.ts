import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { DEFAULT_SITE_SETTINGS } from "@/lib/auth/store";

describe("default MNS brand assets", () => {
    it("uses the MNS icon for default site settings", () => {
        expect(DEFAULT_SITE_SETTINGS.logoUrl).toBe("/mns_icon.png");
        expect(DEFAULT_SITE_SETTINGS.iconUrl).toBe("/mns_icon.png");
    });

    it("keeps web svg fallbacks pointed at the MNS icon without triangle primitives", async () => {
        const [logo, icon] = await Promise.all([readFile(resolve(process.cwd(), "public/logo.svg"), "utf8"), readFile(resolve(process.cwd(), "public/icon.svg"), "utf8")]);

        expect(logo).toContain('href="/mns_icon.png"');
        expect(icon).toContain('href="/mns_icon.png"');
        expect(logo).not.toMatch(/<(?:polygon|polyline)\b|triangle/i);
        expect(icon).not.toMatch(/<(?:polygon|polyline)\b|triangle/i);
    });
});
