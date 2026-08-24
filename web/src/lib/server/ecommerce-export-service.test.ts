import { describe, expect, it } from "vitest";

import { readZip } from "@/lib/zip";
import { buildEcommerceProjectZip } from "./ecommerce-export-service";
import { vi } from "vitest";

vi.mock("@/lib/server/creative-runtime-store", () => ({
    getCreativeAssetsByIds: vi.fn(async () => [{ id: "asset-1", userId: "user-1", storageKey: "permanent/image.png", status: "ready", type: "image" }]),
}));
vi.mock("@/lib/server/local-media-registry", () => ({
    getLocalMediaRegistration: vi.fn(async () => ({ ownerUserId: "user-1", storageKey: "permanent/image.png", scope: "reference", storageProvider: "local", mimeType: "image/png" })),
}));
vi.mock("node:fs/promises", () => ({ readFile: vi.fn(async () => Buffer.from([137, 80, 78, 71])) }));

describe("ecommerce project ZIP export", () => {
    it("includes a manifest and completed image bytes", async () => {
        const now = Date.now();
        const result = await buildEcommerceProjectZip(
            {
                id: "project-1",
                userId: "user-1",
                clientRequestId: "request-1",
                conversationId: "conversation-1",
                runId: "run-1",
                prompt: "商品套图",
                counts: { square: 1, pageMain: 0, detail: 0 },
                status: "completed",
                productAssetIds: [],
                items: [
                    {
                        id: "item-1",
                        projectId: "project-1",
                        category: "square",
                        ordinal: 1,
                        ratio: "1:1",
                        status: "completed",
                        currentVersion: 1,
                        versions: [{ id: "version-1", itemId: "item-1", version: 1, status: "completed", assetId: "asset-1", createdAt: now, updatedAt: now }],
                        createdAt: now,
                        updatedAt: now,
                    },
                ],
                createdAt: now,
                updatedAt: now,
            },
            "user-1",
        );
        const entries = await readZip(result.blob);
        expect(result.included).toBe(1);
        expect(entries.has("manifest.json")).toBe(true);
        expect(entries.has("images/square-01-v1.png")).toBe(true);
    });
});
