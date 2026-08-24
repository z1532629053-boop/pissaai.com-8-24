export const workspaceActivityWorkspaces = ["agent", "image", "ecommerce", "video"] as const;
export type WorkspaceActivityWorkspace = (typeof workspaceActivityWorkspaces)[number];
export type WorkspaceActivityStatus = "queued" | "planning" | "running" | "partial" | "completed" | "failed" | "paused";

export type WorkspaceActivity = {
    activityId: string;
    workspace: WorkspaceActivityWorkspace;
    status: WorkspaceActivityStatus;
    stage?: string;
    progress?: number;
    completed?: number;
    total?: number;
    failed?: number;
    conversationId?: string;
    runId?: string;
    recordId?: string;
    projectId?: string;
    error?: string;
    updatedAt: number;
};
