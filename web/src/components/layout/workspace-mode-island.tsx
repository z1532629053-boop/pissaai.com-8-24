"use client";

import { Activity, AlertTriangle, Check, ChevronDown, ChevronUp, Clapperboard, Image, LoaderCircle, Sparkles, Store, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { WorkspaceActivity } from "@/lib/workspace-activity-contract";
import { cn } from "@/lib/utils";

const modes = [
    { id: "agent", label: "电商 Agent", icon: Sparkles, href: "/agent" },
    { id: "image", label: "电商生图", icon: Image, href: "/image" },
    { id: "commerce", label: "电商套图", icon: Store, href: "/ecommerce" },
    { id: "video", label: "电商视频", icon: Clapperboard, href: "/video" },
] as const;

function activitySnapshotSignature(activities: WorkspaceActivity[]) {
    return activities
        .map((activity) => [activity.activityId, activity.workspace, activity.status, activity.progress, activity.completed, activity.total, activity.failed, activity.conversationId, activity.recordId, activity.projectId, activity.updatedAt].join(":"))
        .join("|");
}

export function WorkspaceModeIsland({ sidePanelOpen = false }: { sidePanelOpen?: boolean }) {
    const pathname = usePathname();
    const islandRef = useRef<HTMLElement>(null);
    const [locationState, setLocationState] = useState({ hash: "", search: "" });
    const [activities, setActivities] = useState<WorkspaceActivity[]>([]);
    const activitySnapshotRef = useRef("");
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        const syncLocation = () => setLocationState({ hash: window.location.hash, search: window.location.search });
        syncLocation();
        window.addEventListener("hashchange", syncLocation);
        window.addEventListener("popstate", syncLocation);
        return () => {
            window.removeEventListener("hashchange", syncLocation);
            window.removeEventListener("popstate", syncLocation);
        };
    }, []);

    useEffect(() => {
        let active = true;
        const apply = (next: WorkspaceActivity[]) => {
            if (!active) return;
            const signature = activitySnapshotSignature(next);
            if (signature === activitySnapshotRef.current) return;
            activitySnapshotRef.current = signature;
            setActivities(next);
        };
        const load = () =>
            fetch("/api/workspace/activities", { credentials: "include" })
                .then((response) => response.json())
                .then((body: { data?: { activities?: WorkspaceActivity[] } }) => apply(body.data?.activities || []))
                .catch(() => undefined);
        void load();
        const events = new EventSource("/api/workspace/activities/events");
        events.addEventListener("workspace.activities.snapshot", (event) => {
            try {
                apply((JSON.parse((event as MessageEvent).data) as { activities?: WorkspaceActivity[] }).activities || []);
            } catch {
                /* ignore malformed event */
            }
        });
        events.onerror = () => {
            void load();
        };
        return () => {
            active = false;
            events.close();
        };
    }, []);

    useEffect(() => {
        const island = islandRef.current;
        const main = island?.closest<HTMLElement>("main");
        if (!island || !main) return;

        const syncReservedSpace = () => {
            const height = Math.ceil(island.getBoundingClientRect().height);
            main.style.setProperty("--mns-workspace-island-space", `${height + 32}px`);
        };

        syncReservedSpace();
        const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(syncReservedSpace);
        observer?.observe(island);
        return () => {
            observer?.disconnect();
            if (main.querySelector('[data-testid="workspace-mode-island"]') === island) main.style.removeProperty("--mns-workspace-island-space");
        };
    }, [activities.length, expanded]);

    const activeMode =
        pathname === "/agent" || pathname === "/create"
            ? locationState.search.includes("surface=commerce") || locationState.hash.includes("surface=commerce")
                ? "commerce"
                : locationState.search.includes("mode=video") || locationState.hash.includes("mode=video")
                  ? "video"
                  : locationState.search.includes("mode=image") || locationState.hash.includes("mode=image")
                    ? "image"
                    : "agent"
            : pathname === "/image"
              ? "image"
              : pathname === "/video"
                ? "video"
                : pathname === "/ecommerce"
                  ? "commerce"
                  : "agent";

    const activeModeEntry = modes.find((mode) => mode.id === activeMode) || modes[0];
    const modeLabel = activeModeEntry.label;
    const currentActivity = activities.find((activity) => activity.workspace === activeMode);
    const hasActivity = Boolean(currentActivity);
    const statusLabel = currentActivity ? activityStatusLabel(currentActivity.status) : "";
    const statusClassName = currentActivity ? activityStatusClassName(currentActivity.status) : "";
    const state = expanded ? "expanded" : "compact";

    useEffect(() => {
        if (!currentActivity) setExpanded(false);
    }, [currentActivity]);

    return (
        <nav ref={islandRef} aria-label="电商创作功能" className={cn("mns-workspace-island", `mns-workspace-island-${state}`, !hasActivity && "mns-workspace-island-no-activity", sidePanelOpen && "mns-workspace-island-panel-open")} data-testid="workspace-mode-island" data-island-state={state}>
            <div className="mns-workspace-island-aurora" aria-hidden="true" />
            <div className="mns-workspace-island-ring" aria-hidden="true" />
            <div className="mns-workspace-island-sheen" aria-hidden="true" />
            <div className="mns-workspace-island-glint" aria-hidden="true" />
            <div className="mns-workspace-island-inner">
                <div className="mns-workspace-island-modes" aria-label="创作模式">
                    {modes.map(({ id, label, icon: Icon, href }) => (
                        <Link key={id} href={href} aria-current={activeMode === id ? "page" : undefined} className={cn("mns-workspace-island-item", activeMode === id && "mns-workspace-island-item-active")}>
                            <Icon className="size-4 shrink-0" />
                            <span>{label}</span>
                        </Link>
                    ))}
                </div>
                {currentActivity ? (
                    <button key={`${currentActivity.activityId}:${currentActivity.status}`} type="button" className="mns-workspace-island-activity mns-workspace-island-activity-enter" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} aria-label={expanded ? "收起工作台活动" : "展开工作台活动"}>
                        <span className={cn("mns-workspace-island-activity-icon", statusClassName)}>{currentActivity.status === "running" || currentActivity.status === "planning" ? <LoaderCircle className="size-4 animate-spin" /> : currentActivity.status === "failed" ? <X className="size-4" /> : currentActivity.status === "completed" ? <Check className="size-4" /> : <Activity className="size-4" />}</span>
                        <span className="mns-workspace-island-activity-copy">
                            <strong>{modeLabel}</strong>
                            <small>{`${currentActivity.stage || "创作任务"} · ${currentActivity.completed || 0}/${currentActivity.total || 0} · ${currentActivity.progress || 0}%`}</small>
                        </span>
                        <span className={cn("mns-workspace-island-status", statusClassName)}>{statusLabel}</span>
                        {expanded ? <ChevronUp className="size-4 shrink-0 text-slate-400" /> : <ChevronDown className="size-4 shrink-0 text-slate-400" />}
                    </button>
                ) : null}
            </div>
            {currentActivity && expanded ? (
                <div className="mns-workspace-island-expanded">
                    <div className="mns-workspace-island-expanded-heading"><span>最近活动</span><span>{activities.length ? `${activities.length} 个任务` : "暂无活动"}</span></div>
                    {activities.map((activity) => {
                        const base = activity.workspace === "agent" ? "/agent" : activity.workspace === "image" ? "/image" : activity.workspace === "video" ? "/video" : "/ecommerce";
                        const params = new URLSearchParams();
                        if (activity.conversationId) params.set("conversationId", activity.conversationId);
                        if ((activity.workspace === "image" || activity.workspace === "video") && activity.recordId) params.set("recordId", activity.recordId);
                        if (activity.workspace === "ecommerce" && activity.projectId) params.set("projectId", activity.projectId);
                        const href = params.size ? `${base}?${params}` : base;
                        return <Link key={activity.activityId} href={href} className="mns-workspace-island-activity-row"><span className="mns-workspace-island-activity-row-icon">{activity.status === "running" || activity.status === "planning" ? <LoaderCircle className="size-3.5 animate-spin" /> : activity.status === "failed" ? <AlertTriangle className="size-3.5" /> : activity.status === "completed" ? <Check className="size-3.5" /> : <Activity className="size-3.5" />}</span><span className="min-w-0 flex-1"><strong>{activity.stage || "创作任务"}</strong><small>{modes.find((mode) => mode.id === activity.workspace)?.label || "电商 Agent"}</small></span><span className="mns-workspace-island-activity-row-meta">{activity.completed || 0}/{activity.total || 0}<small>{activityStatusLabel(activity.status)}</small></span></Link>;
                    })}
                </div>
            ) : null}
        </nav>
    );
}

function activityStatusLabel(status: WorkspaceActivity["status"]) {
    return status === "completed" ? "已完成" : status === "failed" ? "生成失败" : status === "paused" ? "已暂停" : status === "partial" ? "部分完成" : status === "queued" ? "排队中" : status === "planning" ? "规划中" : "生成中";
}

function activityStatusClassName(status: WorkspaceActivity["status"]) {
    return status === "completed" ? "mns-workspace-island-status-completed" : status === "failed" ? "mns-workspace-island-status-failed" : status === "paused" ? "mns-workspace-island-status-paused" : status === "partial" ? "mns-workspace-island-status-partial" : status === "queued" || status === "planning" || status === "running" ? "mns-workspace-island-status-running" : "mns-workspace-island-status-idle";
}
