import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { createEcommerceExport, getLatestEcommerceExport, getEcommerceProject } from "@/lib/server/ecommerce-project-store";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ code: 401, data: null, msg: "请先登录" }, { status: 401 });
    const { id } = await context.params;
    const record = await getLatestEcommerceExport(id, user.id);
    if (!(await getEcommerceProject(id, user.id))) return NextResponse.json({ code: 404, data: null, msg: "电商项目不存在" }, { status: 404 });
    return NextResponse.json({ code: 0, data: { export: record }, msg: "OK" });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ code: 401, data: null, msg: "请先登录" }, { status: 401 });
    const { id } = await context.params;
    const project = await getEcommerceProject(id, user.id);
    if (!project) return NextResponse.json({ code: 404, data: null, msg: "电商项目不存在" }, { status: 404 });
    if (project.items.some((item) => item.status === "failed")) return NextResponse.json({ code: 409, data: null, msg: "导出将跳过失败项，请确认后再导出" }, { status: 409 });
    const record = await createEcommerceExport(id, user.id);
    return NextResponse.json({ code: 0, data: { export: record, downloadUrl: `/api/ecommerce/projects/${id}/export/download` }, msg: "导出任务已创建，可下载项目 ZIP" });
}
