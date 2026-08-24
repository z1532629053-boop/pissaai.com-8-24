"use client";

import { AlertTriangle, Bot, Check, ChevronDown, ChevronUp, CircleDollarSign, Clock3, Image as ImageIcon, Layers3, LoaderCircle, Sparkles, Video, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type DemoStatus = "running" | "completed" | "failed" | "balance";
type DemoFilter = "all" | "running" | "completed" | "failed";
type FeatureId = "agent" | "image" | "kit" | "video";

type DemoTask = {
    id: string;
    feature: FeatureId;
    title: string;
    detail: string;
    status: DemoStatus;
    progress?: number;
    time: string;
    icon: typeof ImageIcon;
};

const features: Array<{ id: FeatureId; label: string; icon: typeof ImageIcon; className: string; activeClassName: string }> = [
    { id: "agent", label: "电商 Agent", icon: Bot, className: "text-cyan-600", activeClassName: "border-cyan-200 bg-cyan-50" },
    { id: "image", label: "电商生图", icon: ImageIcon, className: "text-emerald-600", activeClassName: "border-emerald-200 bg-emerald-50" },
    { id: "kit", label: "电商套图", icon: Layers3, className: "text-amber-600", activeClassName: "border-amber-200 bg-amber-50" },
    { id: "video", label: "电商视频", icon: Video, className: "text-rose-600", activeClassName: "border-rose-200 bg-rose-50" },
];

const initialTasks: DemoTask[] = [
    { id: "poster", feature: "image", title: "产品海报", detail: "图片生成 · 4 张", status: "running", progress: 68, time: "刚刚", icon: ImageIcon },
    { id: "video", feature: "video", title: "品牌短片", detail: "视频生成 · 12 秒", status: "completed", progress: 100, time: "2 分钟前", icon: Video },
    { id: "failed", feature: "kit", title: "电商套图", detail: "生成渠道连接超时", status: "failed", time: "5 分钟前", icon: AlertTriangle },
    { id: "balance", feature: "agent", title: "积分余额变动", detail: "生成任务扣除 24 积分", status: "balance", time: "5 分钟前", icon: CircleDollarSign },
];

const statusMeta: Record<DemoStatus, { label: string; className: string; islandClassName: string }> = {
    running: { label: "生成中", className: "text-sky-700 dark:text-sky-300", islandClassName: "border-sky-200 bg-sky-100 text-sky-700" },
    completed: { label: "已完成", className: "text-emerald-700 dark:text-emerald-300", islandClassName: "border-emerald-200 bg-emerald-100 text-emerald-700" },
    failed: { label: "生成失败", className: "text-rose-700 dark:text-rose-300", islandClassName: "border-rose-200 bg-rose-100 text-rose-700" },
    balance: { label: "余额变动", className: "text-amber-700 dark:text-amber-300", islandClassName: "border-amber-200 bg-amber-100 text-amber-700" },
};

const taskTone: Record<DemoStatus, string> = {
    running: "bg-sky-50/80",
    completed: "bg-emerald-50/80",
    failed: "bg-rose-50/80",
    balance: "bg-amber-50/80",
};

const filters: Array<{ id: DemoFilter; label: string }> = [
    { id: "all", label: "全部" },
    { id: "running", label: "生成中" },
    { id: "completed", label: "已完成" },
    { id: "failed", label: "异常" },
];

export default function IslandPreviewPage() {
    const prefersReducedMotion = useReducedMotion();
    const [expanded, setExpanded] = useState(false);
    const [activeFeature, setActiveFeature] = useState<FeatureId>("agent");
    const [selectedId, setSelectedId] = useState("poster");
    const [tasks, setTasks] = useState(initialTasks);
    const [filter, setFilter] = useState<DemoFilter>("all");
    const selected = useMemo(() => tasks.find((task) => task.id === selectedId) || tasks[0], [selectedId, tasks]);
    const filteredTasks = filter === "all" ? tasks : tasks.filter((task) => task.status === filter);

    const cycleDemo = () => {
        if (!tasks.length) {
            setTasks(initialTasks.map((task) => (task.id === "poster" ? { ...task, progress: 30 } : task)));
            setSelectedId("poster");
            return;
        }
        if (tasks[0].status === "failed") {
            setTasks([]);
            setExpanded(false);
            return;
        }
        setTasks((current) =>
            current.map((task) =>
                task.id === "poster"
                    ? {
                          ...task,
                          status: task.status === "running" ? "completed" : "failed",
                          progress: task.status === "running" ? 100 : undefined,
                      }
                    : task,
            ),
        );
        setSelectedId("poster");
    };

    return (
        <main className="app-scroll-page bg-[#eef6f8] px-4 py-16 text-slate-900 dark:bg-[#101519] dark:text-slate-100 sm:px-8">
            <div className="mx-auto max-w-5xl">
                <div className="mb-8 flex items-end justify-between gap-4 max-sm:flex-col max-sm:items-start">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">VOZEB PRO · 灵动岛预览</p>
                        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">电商创作灵动岛</h1>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">常驻创作入口 · 实时任务动态</p>
                    </div>
                    <button
                        type="button"
                        onClick={cycleDemo}
                        className="inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium shadow-sm transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-sky-600 dark:hover:text-sky-300"
                    >
                        <Sparkles className="size-4" /> 模拟下一状态
                    </button>
                </div>

                <motion.section
                    layout
                    transition={{ layout: { type: "spring", stiffness: 360, damping: 32, mass: 0.85 } }}
                    className={cn("mx-auto w-full overflow-hidden rounded-[24px] border border-slate-200/90 bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.14)] backdrop-blur-xl", selected ? "max-w-[920px]" : "max-w-[560px]")}
                >
                    <motion.div layout className="flex flex-col sm:flex-row">
                        <motion.nav layout className={cn("grid min-w-0 grid-cols-4 gap-1 p-1.5", selected && "border-b border-slate-200/80 sm:border-b-0 sm:border-r")} aria-label="电商创作功能">
                            {features.map((feature) => {
                                const Icon = feature.icon;
                                return (
                                    <motion.button
                                        layout
                                        key={feature.id}
                                        type="button"
                                        onClick={() => setActiveFeature(feature.id)}
                                        className={cn(
                                            "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[18px] border border-transparent px-1 text-xs font-medium transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 sm:min-w-[132px] sm:flex-row sm:gap-1.5 sm:px-2",
                                            activeFeature === feature.id && feature.activeClassName,
                                        )}
                                        aria-pressed={activeFeature === feature.id}
                                        whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}
                                        style={{ color: activeFeature === feature.id ? "#0f172a" : "#475569" }}
                                    >
                                        <Icon className={cn("size-4 shrink-0", feature.className)} />
                                        <span className="truncate">{feature.label}</span>
                                    </motion.button>
                                );
                            })}
                        </motion.nav>

                        <AnimatePresence initial={false} mode="popLayout">
                            {selected && (
                                <motion.div
                                    layout
                                    key={`${selected.id}-${selected.status}`}
                                    className="relative min-w-0 flex-1"
                                    initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -18, scale: 0.94 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -14, scale: 0.94 }}
                                    transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.75 }}
                                >
                                    <span aria-hidden className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 sm:left-0 sm:top-1/2">
                                        <motion.span
                                            className="block size-4 rounded-full bg-white shadow-[0_0_0_5px_rgba(56,189,248,0.12)]"
                                            initial={prefersReducedMotion ? undefined : { scale: 0.3 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: "spring", stiffness: 520, damping: 22 }}
                                        />
                                    </span>
                                    <motion.button
                                        type="button"
                                        className={cn("relative flex min-h-[68px] w-full min-w-0 items-center gap-3 overflow-hidden px-4 text-left sm:px-5", taskTone[selected.status])}
                                        onClick={() => setExpanded((value) => !value)}
                                        aria-expanded={expanded}
                                        animate={selected.status === "failed" && !prefersReducedMotion ? { x: [0, -3, 3, -1, 0] } : undefined}
                                        transition={{ duration: 0.42 }}
                                        style={{ color: "#0f172a" }}
                                    >
                                        <motion.span
                                            className={cn(
                                                "flex size-9 shrink-0 items-center justify-center rounded-full",
                                                selected.status === "running"
                                                    ? "bg-sky-100 text-sky-600"
                                                    : selected.status === "completed"
                                                      ? "bg-emerald-100 text-emerald-600"
                                                      : selected.status === "failed"
                                                        ? "bg-rose-100 text-rose-600"
                                                        : "bg-amber-100 text-amber-600",
                                            )}
                                            animate={!prefersReducedMotion && selected.status === "running" ? { scale: [1, 1.07, 1], boxShadow: ["0 0 0 0 rgba(56,189,248,0)", "0 0 0 7px rgba(56,189,248,0.08)", "0 0 0 0 rgba(56,189,248,0)"] } : undefined}
                                            transition={selected.status === "running" ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : undefined}
                                        >
                                            {selected.status === "running" ? <LoaderCircle className="size-4 animate-spin" /> : <selected.icon className="size-4" />}
                                            {!prefersReducedMotion && selected.status !== "running" && (
                                                <motion.span
                                                    aria-hidden
                                                    className="absolute inset-0 rounded-full border border-current"
                                                    initial={{ opacity: 0.7, scale: 0.7 }}
                                                    animate={{ opacity: 0, scale: 1.65 }}
                                                    transition={{ duration: 0.55, ease: "easeOut" }}
                                                />
                                            )}
                                        </motion.span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold">{selected.title}</span>
                                            <span className="mt-0.5 block truncate text-xs text-slate-500">{selected.status === "running" && selected.progress ? `${selected.detail} · ${selected.progress}%` : selected.detail}</span>
                                        </span>
                                        <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold", statusMeta[selected.status].islandClassName)}>{statusMeta[selected.status].label}</span>
                                        {expanded ? <ChevronUp className="size-4 shrink-0 text-slate-400" /> : <ChevronDown className="size-4 shrink-0 text-slate-400" />}
                                        {selected.status === "running" && (
                                            <span aria-hidden className="absolute inset-x-4 bottom-0 h-px overflow-hidden bg-sky-100">
                                                <motion.span
                                                    className="absolute inset-y-0 left-0 bg-sky-400/60"
                                                    initial={prefersReducedMotion ? undefined : { width: 0 }}
                                                    animate={{ width: `${selected.progress || 0}%` }}
                                                    transition={{ type: "spring", stiffness: 120, damping: 24 }}
                                                />
                                                {!prefersReducedMotion && <motion.span className="absolute inset-y-0 left-0 w-12 bg-sky-200" animate={{ x: ["-100%", "720%"] }} transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }} />}
                                            </span>
                                        )}
                                    </motion.button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    <AnimatePresence initial={false}>
                        {selected && expanded && (
                            <motion.div
                                key="recent-activity"
                                className="overflow-hidden"
                                initial={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 360, damping: 34, mass: 0.85 }}
                            >
                                <div className="border-t border-slate-200/80 bg-white/95 px-3 pb-3 pt-2 text-slate-900">
                                    <div className="mb-2 flex items-center gap-1 overflow-x-auto pb-1">
                                        <span className="px-2 text-[11px] font-semibold text-slate-400">最近活动</span>
                                        {filters.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => setFilter(item.id)}
                                                className={cn(
                                                    "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                                                    filter === item.id ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
                                                )}
                                                aria-pressed={filter === item.id}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="grid gap-1 sm:grid-cols-2">
                                        {filteredTasks.map((task) => {
                                            const Icon = task.icon;
                                            const meta = statusMeta[task.status];
                                            return (
                                                <button
                                                    key={task.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedId(task.id);
                                                        setActiveFeature(task.feature);
                                                    }}
                                                    className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition", selectedId === task.id ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-800/60")}
                                                >
                                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-200/70 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                                        {task.status === "running" ? (
                                                            <LoaderCircle className="size-4 animate-spin text-sky-500" />
                                                        ) : task.status === "completed" ? (
                                                            <Check className="size-4 text-emerald-500" />
                                                        ) : task.status === "failed" ? (
                                                            <X className="size-4 text-rose-500" />
                                                        ) : (
                                                            <Icon className="size-4 text-amber-500" />
                                                        )}
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-sm font-medium">{task.title}</span>
                                                        <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{task.detail}</span>
                                                    </span>
                                                    <span className="flex shrink-0 flex-col items-end gap-1">
                                                        <span className={cn("text-xs font-semibold", meta.className)}>{meta.label}</span>
                                                        <span className="text-[11px] text-slate-400">{task.time}</span>
                                                    </span>
                                                </button>
                                            );
                                        })}
                                        {filteredTasks.length === 0 && <p className="px-3 py-8 text-center text-xs text-slate-400 sm:col-span-2">暂无此类活动</p>}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.section>

                <div className="mx-auto mt-5 flex max-w-[920px] items-center justify-between rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
                    <span className="inline-flex items-center gap-2">
                        <Clock3 className="size-3.5" /> {selected ? "SSE 实时状态 · 演示数据" : "常驻状态 · 暂无任务"}
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">余额 1,248 积分</span>
                </div>
            </div>
        </main>
    );
}
