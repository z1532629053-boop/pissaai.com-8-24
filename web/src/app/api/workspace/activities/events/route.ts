import { getCurrentUser } from "@/lib/auth/session";
import { listWorkspaceActivities } from "@/lib/server/workspace-activity-service";
import { listAgentRuns } from "@/lib/server/agent-run-store";
import { waitForCreativeRunEvent } from "@/lib/server/creative-run-event-signal";

export const dynamic = "force-dynamic";
export const maxDuration = 2400;

export async function GET(request: Request) {
    const user = await getCurrentUser(request);
    if (!user) return new Response("请先登录", { status: 401 });
    const encoder = new TextEncoder();
    const body = new ReadableStream({
        start(controller) {
            let closed = false;
            const close = () => {
                if (closed) return;
                closed = true;
                try {
                    controller.close();
                } catch {
                    /* client disconnected */
                }
            };
            request.signal.addEventListener("abort", close, { once: true });
            void (async () => {
                let eventId = Number(request.headers.get("last-event-id") || 0);
                const send = async () => {
                    const activities = await listWorkspaceActivities(user.id);
                    if (closed) return;
                    eventId += 1;
                    controller.enqueue(encoder.encode(`id: ${eventId}\nevent: workspace.activities.snapshot\ndata: ${JSON.stringify({ activities })}\n\n`));
                    return activities;
                };
                let activities = await send();
                while (!closed) {
                    const runs = await listAgentRuns({ userId: user.id, surface: "chat", statuses: ["planning", "running", "paused"], limit: 50 });
                    if (!runs.length) {
                        await waitForCreativeRunEvent("workspace", 15_000, request.signal);
                    } else {
                        await Promise.race(runs.map((run) => waitForCreativeRunEvent(run.id, 15_000, request.signal)));
                    }
                    if (closed) return;
                    activities = (await send()) || [];
                    if (!activities.length && request.signal.aborted) return;
                }
            })().catch(close);
        },
        cancel() {
            /* request abort closes the stream */
        },
    });
    return new Response(body, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
}
