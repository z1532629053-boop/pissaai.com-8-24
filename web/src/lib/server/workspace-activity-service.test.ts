import { beforeEach, describe, expect, it, vi } from "vitest";

import { listWorkspaceActivities, workspaceActivityFromRun } from "./workspace-activity-service";
import type { AgentRun } from "./agent-run-store";

const mocks = vi.hoisted(() => ({
    listAgentRuns: vi.fn(),
    getCreativeConversation: vi.fn(),
    listEcommerceProjects: vi.fn(),
    listGenerationLogs: vi.fn(),
}));

vi.mock("@/lib/server/agent-run-store", () => ({ listAgentRuns: mocks.listAgentRuns, getAgentRun: vi.fn() }));
vi.mock("@/lib/server/creative-runtime-store", () => ({ getCreativeConversation: mocks.getCreativeConversation }));
vi.mock("@/lib/server/ecommerce-project-store", () => ({ listEcommerceProjects: mocks.listEcommerceProjects }));
vi.mock("@/lib/server/generation-log-store", () => ({ listGenerationLogs: mocks.listGenerationLogs }));

describe("workspace activity service", () => {
    beforeEach(() => {
        mocks.listAgentRuns.mockResolvedValue([]);
        mocks.getCreativeConversation.mockResolvedValue(undefined);
        mocks.listEcommerceProjects.mockResolvedValue([]);
        mocks.listGenerationLogs.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 50 });
    });

    it("marks ecommerce activities with their project id", () => {
        const activity = workspaceActivityFromRun(baseRun(), "ecommerce-workbench", "project-1");

        expect(activity).toMatchObject({ workspace: "ecommerce", projectId: "project-1", conversationId: "conversation-1", runId: "run-1" });
    });

    it("includes pending image and video generation logs as independent activities", async () => {
        mocks.listGenerationLogs
            .mockResolvedValueOnce({ items: [generationLog("image-log", "image-workbench", "image", 4, 1)], total: 1, page: 1, pageSize: 50 })
            .mockResolvedValueOnce({ items: [generationLog("video-log", "video-workbench", "video", 1, 0)], total: 1, page: 1, pageSize: 50 });

        const activities = await listWorkspaceActivities("user-1", 10);

        expect(activities.map((activity) => activity.recordId)).toEqual(["video-log", "image-log"]);
        expect(activities[0]).toMatchObject({ workspace: "video", stage: "正在生成视频", total: 1 });
        expect(activities[1]).toMatchObject({ workspace: "image", stage: "正在生成图片", total: 4, completed: 1 });
    });

    it("deduplicates repeated generation log activities by record id", async () => {
        const older = generationLog("image-log", "image-workbench", "image", 2, 0);
        const newer = { ...older, successCount: 1, updatedAt: "2026-01-03T00:00:00.000Z" };
        mocks.listGenerationLogs.mockResolvedValueOnce({ items: [older, newer], total: 2, page: 1, pageSize: 50 }).mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 50 });

        const activities = await listWorkspaceActivities("user-1", 10);

        expect(activities).toHaveLength(1);
        expect(activities[0]).toMatchObject({ recordId: "image-log", completed: 1, updatedAt: Date.parse("2026-01-03T00:00:00.000Z") });
    });
});

function baseRun(): AgentRun {
    return {
        id: "run-1",
        userId: "user-1",
        conversationId: "conversation-1",
        clientRequestId: "client-1",
        inputMessageId: "message-user",
        assistantMessageId: "message-assistant",
        projectId: undefined,
        prompt: "商品套图",
        publicPrompt: "商品套图",
        surface: "chat",
        source: "ecommerce-workbench",
        status: "running",
        tasks: [{ id: "task-1", title: "square-01", type: "image", prompt: "square-01", count: 1, dependencies: [], status: "running", attempts: 1 }],
        assetIds: [],
        referencedAssetIds: [],
        skillIds: [],
        modelIds: [],
        reviewed: true,
        createdAt: 10,
        updatedAt: 20,
    } as AgentRun;
}

function generationLog(id: string, source: "image-workbench" | "video-workbench", kind: "image" | "video", count: number, successCount: number) {
    return {
        id,
        userId: "user-1",
        conversationId: `${id}-conversation`,
        username: "user",
        displayName: "User",
        kind,
        source,
        status: "pending",
        title: id,
        prompt: id,
        model: "model",
        summary: "",
        durationMs: 0,
        count,
        successCount,
        failCount: 0,
        assets: [],
        taskId: `${id}-task`,
        createdAt: id === "video-log" ? "2026-01-02T00:00:00.000Z" : "2026-01-01T00:00:00.000Z",
        updatedAt: id === "video-log" ? "2026-01-02T00:00:00.000Z" : "2026-01-01T00:00:00.000Z",
    };
}
