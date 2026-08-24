import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("legacy drama entry", () => {
    it("redirects the project list without deleting historical data", async () => {
        const source = await readFile(resolve(process.cwd(), "src/app/(user)/drama/page.tsx"), "utf8");
        expect(source).toContain('redirect("/agent")');
        expect(source).not.toContain("useDramaStore");
    });

    it("redirects legacy project details without deleting historical data", async () => {
        const source = await readFile(resolve(process.cwd(), "src/app/(user)/drama/[id]/page.tsx"), "utf8");
        expect(source).toContain('redirect("/agent")');
        expect(source).not.toContain("useDramaStore");
    });
});
