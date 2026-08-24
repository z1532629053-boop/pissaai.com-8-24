// 快速验证 buildVideoProviderRequest 对 toapis 模板的输出
import { describe, expect, it } from "vitest";
import { buildVideoProviderRequest } from "@/lib/server/provider-task-config";

describe("toapis template rendering", () => {
    it("renders duration as a number for toapis", () => {
        const template = '{"model":"{{model}}","prompt":"{{prompt}}","image":"{{image}}","duration":"{{duration}}","resolution":"{{resolution}}","aspect_ratio":"{{ratio}}"}';
        const values = {
            model: "grok-video-1.5",
            prompt: "test",
            image: "",
            duration: 5,
            seconds: 5,
            ratio: "16:9",
            aspect_ratio: "16:9",
            resolution: "720p",
            quality: "720p",
        };
        const out = buildVideoProviderRequest(template, {}, values) as Record<string, unknown>;
        console.log("OUTPUT:", JSON.stringify(out));
        expect(out.duration).toBe(5);
        expect(typeof out.duration).toBe("number");
    });
});
