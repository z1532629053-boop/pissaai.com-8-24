import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { listWorkspaceActivities } from "@/lib/server/workspace-activity-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ code: 401, data: null, msg: "请先登录" }, { status: 401 });
    const activities = await listWorkspaceActivities(user.id);
    return NextResponse.json({ code: 0, data: { activities }, msg: "OK" });
}
