import { describe, expect, it } from "vitest";

import { DEFAULT_ECOMMERCE_COUNTS, type EcommerceProject } from "@/lib/ecommerce-contract";
import { reconcileEcommerceProjectState } from "./ecommerce-project-store";

describe("ecommerce project reconciliation", () => {
    it("maps completed and failed child results into stable item versions", async () => {
        const now = Date.now();
        const project: EcommerceProject = {
            id: "ecommerce-test",
            userId: "user",
            clientRequestId: "client",
            conversationId: "conversation",
            runId: "run-old",
            prompt: "商品套图",
            counts: { ...DEFAULT_ECOMMERCE_COUNTS, square: 1, pageMain: 0, detail: 0 },
            status: "generating",
            productAssetIds: ["asset-product"],
            items: [
                {
                    id: "item-square-1",
                    projectId: "ecommerce-test",
                    category: "square",
                    ordinal: 1,
                    ratio: "1:1",
                    status: "running",
                    currentVersion: 1,
                    versions: [{ id: "version-1", itemId: "item-square-1", version: 1, status: "running", createdAt: now, updatedAt: now }],
                    createdAt: now,
                    updatedAt: now,
                },
            ],
            createdAt: now,
            updatedAt: now,
        };
        const next = reconcileEcommerceProjectState(project, {
            id: "run-new",
            status: "completed",
            tasks: [{ id: "task-square", title: "方图", status: "completed", assetIds: ["asset-result"] }],
        });
        expect(next.runId).toBe("run-new");
        expect(next.status).toBe("completed");
        expect(next.items[0]).toMatchObject({ status: "completed" });
        expect(next.items[0].versions[0]).toMatchObject({ status: "completed", assetId: "asset-result", sourceTaskId: "task-square" });
    });

    it("matches explicit ecommerce slot keys before falling back to category order", () => {
        const now = Date.now();
        const project: EcommerceProject = {
            id: "ecommerce-slots",
            userId: "user",
            clientRequestId: "client",
            conversationId: "conversation",
            runId: "run-old",
            prompt: "商品套图",
            counts: { square: 1, pageMain: 1, detail: 0 },
            status: "generating",
            productAssetIds: ["asset-product"],
            items: [
                {
                    id: "item-square-1",
                    projectId: "ecommerce-slots",
                    category: "square",
                    ordinal: 1,
                    ratio: "1:1",
                    status: "running",
                    currentVersion: 1,
                    versions: [{ id: "version-square", itemId: "item-square-1", version: 1, status: "running", createdAt: now, updatedAt: now }],
                    createdAt: now,
                    updatedAt: now,
                },
                {
                    id: "item-main-1",
                    projectId: "ecommerce-slots",
                    category: "pageMain",
                    ordinal: 1,
                    ratio: "3:4",
                    status: "running",
                    currentVersion: 1,
                    versions: [{ id: "version-main", itemId: "item-main-1", version: 1, status: "running", createdAt: now, updatedAt: now }],
                    createdAt: now,
                    updatedAt: now,
                },
            ],
            createdAt: now,
            updatedAt: now,
        };
        const next = reconcileEcommerceProjectState(project, {
            id: "run-new",
            status: "completed",
            tasks: [
                { id: "task-main", title: "pageMain-01 长图第 1 张", status: "completed", assetIds: ["asset-main"] },
                { id: "task-square", title: "square-01 方图第 1 张", status: "completed", assetIds: ["asset-square", "asset-extra"] },
            ],
        });
        expect(next.items[0].versions[0]).toMatchObject({ assetId: "asset-square", sourceTaskId: "task-square" });
        expect(next.items[1].versions[0]).toMatchObject({ assetId: "asset-main", sourceTaskId: "task-main" });
    });
});
