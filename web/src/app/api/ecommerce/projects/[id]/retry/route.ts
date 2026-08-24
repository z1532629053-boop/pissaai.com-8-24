import { after, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { getAuthSettings } from "@/lib/auth/store";
import { readJsonBodyResult } from "@/lib/auth/request";
import { getEcommerceProject } from "@/lib/server/ecommerce-project-store";
import { getAgentRun, updateAgentRunById } from "@/lib/server/agent-run-store";
import { failedAgentTaskRetryOps, prepareFailedAgentTaskRetry } from "@/lib/server/agent-run-task-input";
import { scheduleGenerationTask } from "@/lib/server/generation-task-scheduler";
import { runGenerationTaskRecoveryBatch } from "@/lib/server/generation-task-recovery-service";
import { resolveInternalOrigin } from "@/lib/server/internal-origin";
import { publicAgentRun } from "@/lib/server/agent-run-public";
import { withGenerationConcurrencyLimit } from "@/lib/server/generation-task-store";

export const maxDuration = 2400;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ code: 401, data: null, msg: "请先登录" }, { status: 401 });
    const { id } = await context.params;
    const project = await getEcommerceProject(id, user.id);
    if (!project) return NextResponse.json({ code: 404, data: null, msg: "电商项目不存在" }, { status: 404 });
    if (!project.runId) return NextResponse.json({ code: 409, data: null, msg: "项目还没有可重试的生成任务" }, { status: 409 });
    const run = await getAgentRun(project.runId);
    if (!run || run.userId !== user.id || run.conversationId !== project.conversationId) return NextResponse.json({ code: 409, data: null, msg: "项目运行记录已失效" }, { status: 409 });
    const parsed = await readJsonBodyResult<{ conversationId?: unknown }>(request);
    if (!parsed.ok) return NextResponse.json({ code: parsed.status, data: null, msg: parsed.message }, { status: parsed.status });
    const conversationId = typeof parsed.data?.conversationId === "string" ? parsed.data.conversationId.trim() : project.conversationId;
    if (conversationId !== project.conversationId) return NextResponse.json({ code: 409, data: null, msg: "项目会话不匹配" }, { status: 409 });
    const failed = run.tasks.filter((task) => task.status === "failed");
    if (!failed.length) return NextResponse.json({ code: 409, data: null, msg: "当前项目没有失败项" }, { status: 409 });
    const settings = await getAuthSettings();
    const retriedTasks = run.tasks.map((task) => (failed.some((item) => item.id === task.id) ? prepareFailedAgentTaskRetry(run, { ...task, status: "ready" as const, result: undefined, error: undefined }, settings) : task));
    const result = await withGenerationConcurrencyLimit(
        user.id,
        "agent",
        10 * 60 * 1000,
        settings.generationConcurrency.agent,
        async () =>
            updateAgentRunById(
                run.id,
                { status: "running", tasks: retriedTasks },
                { type: "task.retry.requested", data: { taskIds: failed.map((task) => task.id), ops: retriedTasks.filter((task) => failed.some((item) => item.id === task.id)).flatMap((task) => failedAgentTaskRetryOps(run, task)) } },
                [run.status],
            ),
        run.id,
    );
    if (!result) return NextResponse.json({ code: 429, data: null, msg: `当前最多同时运行 ${settings.generationConcurrency.agent} 个 Agent 任务` }, { status: 429 });
    const origin = resolveInternalOrigin(new URL(request.url).origin);
    const cookie = request.headers.get("cookie") || "";
    await scheduleGenerationTask("agent", result.id, { executionPhase: "created", nextPollAt: Date.now(), lastUpstreamStatus: "task_retry" });
    after(() => runGenerationTaskRecoveryBatch({ origin, cookie, limit: 1, taskIds: [result.id] }));
    return NextResponse.json({ code: 0, data: { project, run: publicAgentRun(result), retriedTaskIds: failed.map((task) => task.id) }, msg: "失败项已统一重试" });
}
