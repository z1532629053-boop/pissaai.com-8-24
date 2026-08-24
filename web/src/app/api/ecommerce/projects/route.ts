import { after, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { readJsonBody } from "@/lib/auth/request";
import { EcommerceInputError } from "@/lib/ecommerce-contract";
import { listEcommerceProjects } from "@/lib/server/ecommerce-project-store";
import { createEcommerceProjectForUser } from "@/lib/server/ecommerce-project-service";
import { resolveInternalOrigin } from "@/lib/server/internal-origin";
import { runGenerationTaskRecoveryBatch } from "@/lib/server/generation-task-recovery-service";
import { publicAgentRun } from "@/lib/server/agent-run-public";

export const maxDuration = 2400;

export async function GET(request: Request) {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ code: 401, data: null, msg: "请先登录" }, { status: 401 });
    const limit = Number(new URL(request.url).searchParams.get("limit"));
    const projects = await listEcommerceProjects(user.id, Number.isSafeInteger(limit) ? limit : 30);
    return NextResponse.json({ code: 0, data: { projects }, msg: "OK" });
}

export async function POST(request: Request) {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ code: 401, data: null, msg: "请先登录" }, { status: 401 });
    try {
        const result = await createEcommerceProjectForUser(user.id, await readJsonBody<unknown>(request));
        if ("run" in result) {
            const origin = resolveInternalOrigin(new URL(request.url).origin);
            after(() => runGenerationTaskRecoveryBatch({ origin, cookie: request.headers.get("cookie") || "", limit: 1, taskIds: [result.run.id] }));
        }
        return NextResponse.json({
            code: 0,
            data: { project: result.project, conversation: "conversation" in result ? result.conversation : undefined, run: "run" in result ? publicAgentRun(result.run) : undefined, created: result.created },
            msg: result.created ? "电商套图任务已创建" : "电商套图任务已存在",
        });
    } catch (error) {
        if (error instanceof EcommerceInputError) return NextResponse.json({ code: error.status, data: null, msg: error.message }, { status: error.status });
        throw error;
    }
}
