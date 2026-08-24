import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("island preview", () => {
    it("contains the task lifecycle states requested for the visual prototype", async () => {
        const source = await readFile(resolve(process.cwd(), "src/app/island-preview/page.tsx"), "utf8");
        for (const state of ['"running"', '"completed"', '"failed"', '"balance"']) expect(source).toContain(state);
        expect(source).toContain("模拟下一状态");
        expect(source).toContain("电商创作灵动岛");
        for (const feature of ["电商 Agent", "电商生图", "电商套图", "电商视频"]) expect(source).toContain(feature);
        expect(source).toContain("常驻状态 · 暂无任务");
        expect(source).toContain("max-w-[560px]");
        expect(source).toContain("max-w-[920px]");
        expect(source).toContain("bg-white/95");
        expect(source).toContain("bg-sky-50/80");
        expect(source).toContain("bg-rose-50/80");
        expect(source).toContain("useReducedMotion");
        expect(source).toContain('type: "spring"');
        expect(source).toContain("AnimatePresence");
    });
});
