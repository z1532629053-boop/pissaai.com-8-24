import { describe, it, expect } from "vitest";
import { isSafeOutboundUrl } from "@/lib/server/outbound-url-security";

describe("live outbound DNS diagnosis", () => {
    it("checks toapis.com", async () => {
        const ok = await isSafeOutboundUrl("https://toapis.com/v1/videos/generations");
        console.log("toapis.com safe:", ok);
        expect(ok).toBe(true);
    }, 30000);

    it("checks image.codesonline.dev", async () => {
        const ok = await isSafeOutboundUrl("https://image.codesonline.dev/v1/images/generations");
        console.log("image.codesonline.dev safe:", ok);
        expect(ok).toBe(true);
    }, 30000);
});
