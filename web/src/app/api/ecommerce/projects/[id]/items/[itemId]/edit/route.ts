import { after, NextResponse } from "next/server";

import { readJsonBodyResult } from "@/lib/auth/request";
import { getCurrentUser } from "@/lib/auth/session";
import { EcommerceInputError } from "@/lib/ecommerce-contract";
import { publicAgentRun } from "@/lib/server/agent-run-public";
import { getEcommerceProject } from "@/lib/server/ecommerce-project-store";
import { editEcommerceItemForUser } from "@/lib/server/ecommerce-project-service";
import { runGenerationTaskRecoveryBatch } from "@/lib/server/generation-task-recovery-service";
import { resolveInternalOrigin } from "@/lib/server/internal-origin";

export const maxDuration = 2400;

export async function POST(request: Request, context: { params: Promise<{ id: string; itemId: string }> }) {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ code: 401, data: null, msg: "请先登录" }, { status: 401 });
    const { id, itemId } = await context.params;
    const project = await getEcommerceProject(id, user.id);
    if (!project) return NextResponse.json({ code: 404, data: null, msg: "电商项目不存在" }, { status: 404 });
    const parsed = await readJsonBodyResult<{ clientRequestId?: unknown; sourceVersionId?: unknown; instruction?: unknown; maskAssetId?: unknown }>(request);
    if (!parsed.ok) return NextResponse.json({ code: parsed.status, data: null, msg: parsed.message }, { status: parsed.status });
    try {
        const result = await editEcommerceItemForUser(user.id, project, itemId, parsed.data || {});
        const origin = resolveInternalOrigin(new URL(request.url).origin);
        if (result.created) after(() => runGenerationTaskRecoveryBatch({ origin, cookie: request.headers.get("cookie") || "", limit: 1, taskIds: [result.run.id] }));
        return NextResponse.json({ code: 0, data: { project: result.project, item: result.item, run: publicAgentRun(result.run), created: result.created }, msg: result.created ? "局部编辑任务已创建" : "局部编辑任务已存在" });
    } catch (error) {
        if (error instanceof EcommerceInputError) return NextResponse.json({ code: error.status, data: null, msg: error.message }, { status: error.status });
        throw error;
    }
}
