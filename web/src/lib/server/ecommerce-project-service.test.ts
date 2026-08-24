import { describe, expect, it } from "vitest";

import { buildEcommerceExecutionPrompt } from "./ecommerce-project-service";

describe("ecommerce project service", () => {
    it("builds a stable slot contract for the planner and executor", () => {
        const prompt = buildEcommerceExecutionPrompt("新品保温杯", { square: 1, pageMain: 2, detail: 1 });

        expect(prompt).toContain("square-01｜方图第 1 张｜比例 1:1");
        expect(prompt).toContain("pageMain-01｜长图第 1 张｜比例 3:4");
        expect(prompt).toContain("pageMain-02｜长图第 2 张｜比例 3:4");
        expect(prompt).toContain("detail-01｜详情图第 1 张｜比例 3:4");
        expect(prompt).toContain("任务标题必须包含槽位编号");
    });
});
