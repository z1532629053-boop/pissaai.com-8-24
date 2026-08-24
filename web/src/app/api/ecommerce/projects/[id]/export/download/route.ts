import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { buildEcommerceProjectZip } from "@/lib/server/ecommerce-export-service";
import { getEcommerceProject } from "@/lib/server/ecommerce-project-store";

export const maxDuration = 2400;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ code: 401, data: null, msg: "请先登录" }, { status: 401 });
    const { id } = await context.params;
    const project = await getEcommerceProject(id, user.id);
    if (!project) return NextResponse.json({ code: 404, data: null, msg: "电商项目不存在" }, { status: 404 });
    const result = await buildEcommerceProjectZip(project, user.id);
    if (!result.included) return NextResponse.json({ code: 409, data: null, msg: "项目暂无可导出的成功图片" }, { status: 409 });
    return new Response(result.blob, {
        headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="ecommerce-${safeName(project.id)}.zip"`,
            "X-Ecommerce-Included": String(result.included),
            "X-Ecommerce-Missing": String(result.missing),
        },
    });
}

function safeName(value: string) {
    return value.replace(/[^a-z0-9_-]+/gi, "-").slice(0, 80) || "project";
}
