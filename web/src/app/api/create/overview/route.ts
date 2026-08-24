import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { getCreateWorkbenchOverview } from "@/lib/server/create-workbench-overview-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ code: 401, data: null, msg: "请先登录" }, { status: 401 });
    const source = new URL(request.url).searchParams.get("source") || "agent";
    return NextResponse.json({ code: 0, data: { overview: await getCreateWorkbenchOverview(user.id, source) }, msg: "OK" });
}
