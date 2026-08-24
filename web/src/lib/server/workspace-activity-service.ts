import type { WorkspaceActivity, WorkspaceActivityStatus, WorkspaceActivityWorkspace } from "@/lib/workspace-activity-contract";
import { getAgentRun, listAgentRuns, type AgentRun } from "@/lib/server/agent-run-store";
import { getCreativeConversation } from "@/lib/server/creative-runtime-store";
import { listEcommerceProjects } from "@/lib/server/ecommerce-project-store";
import { listGenerationLogs } from "@/lib/server/generation-log-store";
import type { StoredGenerationLog } from "@/lib/server/generation-log-types";

export async function listWorkspaceActivities(userId: string, limit = 20) {
    const runs = await listAgentRuns({ userId, surface: "chat", statuses: ["planning", "running", "paused"], limit: Math.min(50, Math.max(1, limit)) });
    const ecommerceProjects = await listEcommerceProjects(userId, 100).catch(() => []);
    const ecommerceProjectByRun = new Map(ecommerceProjects.filter((project) => project.runId).map((project) => [project.runId, project.id]));
    const runActivities = await Promise.all(runs.map(async (run) => toWorkspaceActivity(run, (await getCreativeConversation(run.conversationId, userId))?.source, ecommerceProjectByRun.get(run.id))));
    const [imageLogs, videoLogs] = await Promise.all([listGenerationLogs({ userId, source: "image-workbench", status: "pending", pageSize: 50 }), listGenerationLogs({ userId, source: "video-workbench", status: "pending", pageSize: 50 })]);
    return dedupeActivities([...runActivities, ...imageLogs.items.map(generationLogActivity), ...videoLogs.items.map(generationLogActivity)], limit);
}

export function workspaceActivityFromRun(run: AgentRun, source?: string, projectId?: string) {
    return toWorkspaceActivity(run, source, projectId);
}

export async function getWorkspaceActivityRun(userId: string, runId: string) {
    const run = await getAgentRun(runId);
    return run && run.userId === userId ? run : null;
}

function toWorkspaceActivity(run: AgentRun, source?: string, projectId?: string): WorkspaceActivity {
    const workspace = workspaceForSource(source);
    const tasks = run.tasks || [];
    const total = tasks.reduce((sum, task) => sum + Math.max(1, task.childTasks?.length || task.count || 1), 0);
    const completed = tasks.reduce((sum, task) => sum + (task.childTasks?.filter((child) => child.status === "completed").length || (task.status === "completed" ? Math.max(1, task.count || 1) : 0)), 0);
    const failed = tasks.reduce((sum, task) => sum + (task.childTasks?.filter((child) => child.status === "failed").length || (task.status === "failed" ? Math.max(1, task.count || 1) : 0)), 0);
    const status = activityStatus(run.status, completed, failed, total);
    return {
        activityId: run.id,
        workspace,
        status,
        stage: status === "planning" ? "正在规划创作" : status === "paused" ? "任务已暂停" : status === "completed" ? "已完成" : status === "failed" ? "生成失败" : workspace === "ecommerce" ? "正在生成商品套图" : "正在生成内容",
        progress: total ? Math.min(100, Math.round((completed / total) * 100)) : status === "planning" ? 0 : undefined,
        completed,
        total: total || undefined,
        failed,
        conversationId: run.conversationId,
        runId: run.id,
        projectId: projectId || run.projectId,
        error: run.status === "failed" ? "创作任务失败，请查看原对话重试" : undefined,
        updatedAt: run.updatedAt,
    };
}

function generationLogActivity(log: StoredGenerationLog): WorkspaceActivity {
    const workspace: WorkspaceActivityWorkspace = log.source === "video-workbench" ? "video" : "image";
    const total = Math.max(1, log.count || log.successCount + log.failCount || 1);
    return {
        activityId: `${workspace}:${log.id}`,
        workspace,
        status: "running",
        stage: workspace === "video" ? "正在生成视频" : "正在生成图片",
        progress: total ? Math.min(100, Math.round((log.successCount / total) * 100)) : 0,
        completed: log.successCount,
        total,
        failed: log.failCount,
        conversationId: log.conversationId,
        recordId: log.id,
        runId: log.taskId,
        updatedAt: Date.parse(log.updatedAt) || Date.parse(log.createdAt) || Date.now(),
    };
}

function dedupeActivities(activities: WorkspaceActivity[], limit: number) {
    const deduped = new Map<string, WorkspaceActivity>();
    for (const activity of activities) {
        const key = activity.recordId ? `${activity.workspace}:record:${activity.recordId}` : activity.runId ? `${activity.workspace}:run:${activity.runId}` : `${activity.workspace}:${activity.activityId}`;
        const current = deduped.get(key);
        if (!current || activity.updatedAt > current.updatedAt) deduped.set(key, activity);
    }
    return Array.from(deduped.values())
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, Math.max(1, limit));
}

function workspaceForSource(source?: string): WorkspaceActivityWorkspace {
    return source === "image-workbench" ? "image" : source === "video-workbench" ? "video" : source === "ecommerce-workbench" ? "ecommerce" : "agent";
}

function activityStatus(status: AgentRun["status"], completed: number, failed: number, total: number): WorkspaceActivityStatus {
    if (status === "paused") return "paused";
    if (status === "planning") return "planning";
    if (status === "completed") return "completed";
    if (status === "failed") return completed > 0 ? "partial" : "failed";
    if (failed > 0 && completed > 0) return "partial";
    return status === "running" ? "running" : total ? "queued" : "planning";
}
