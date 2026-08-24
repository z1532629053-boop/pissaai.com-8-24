import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { getEcommerceProject, reconcileEcommerceProject } from "@/lib/server/ecommerce-project-store";
import { getAgentRun } from "@/lib/server/agent-run-store";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ code: 401, data: null, msg: "请先登录" }, { status: 401 });
    const { id } = await context.params;
    const project = await getEcommerceProject(id, user.id);
    if (!project) return NextResponse.json({ code: 404, data: null, msg: "电商项目不存在" }, { status: 404 });
    const run = project.runId ? await getAgentRun(project.runId) : null;
    const reconciled = run && run.userId === user.id ? await reconcileEcommerceProject(project, run) : project;
    return NextResponse.json({ code: 0, data: { project: reconciled }, msg: "OK" });
}
