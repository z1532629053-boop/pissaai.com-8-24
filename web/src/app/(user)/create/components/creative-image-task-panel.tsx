"use client";

import { Button, Modal, Tooltip } from "antd";
import { ChevronLeft, ChevronRight, Download, Expand, Link2, RefreshCw, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { downloadAgentMedia } from "@/components/agent/agent-media-download";
import type { CreativeAsset } from "@/lib/creative-runtime-contract";
import { imagePreviewUrl } from "@/lib/media-image-url";
import { cn } from "@/lib/utils";
import type { CreativeAgentRun } from "@/services/api/creative";

import { creativeRunPresentation } from "./creative-run-presentation";

export function CreativeImageTaskPanel({
    prompt,
    assets,
    run,
    modelNames,
    timing,
    onRetry,
    selectedAssetIds = [],
    onToggleAsset,
}: {
    prompt: string;
    assets: CreativeAsset[];
    run?: CreativeAgentRun;
    modelNames: ReadonlyMap<string, string>;
    timing?: ReactNode;
    onRetry?: () => Promise<boolean | void> | void;
    selectedAssetIds?: string[];
    onToggleAsset?: (id: string) => void;
}) {
    const [previewIndex, setPreviewIndex] = useState<number>();
    const [retrying, setRetrying] = useState(false);
    const results = useMemo(() => assets.filter((asset) => asset.status === "ready" && asset.type === "image" && assetUrl(asset)), [assets]);
    const imageTasks = run?.tasks.filter((item) => item.type === "image") || [];
    const task = imageTasks[0];
    const expectedCount = Math.max(
        results.length,
        imageTasks.reduce((total, item) => total + (item.count || 1), 0),
        run?.status === "running" || run?.status === "planning" || run?.status === "paused" ? 1 : 0,
    );
    const missingCount = Math.max(0, expectedCount - results.length);
    const needsReviewCount = Math.min(
        missingCount,
        imageTasks.reduce((total, item) => total + (item.needsReviewCount || 0), 0),
    );
    const reviewReason = imageTasks.find((item) => item.reviewReason)?.reviewReason;
    if (!results.length && !expectedCount) return null;

    const compactMeta =
        creativeRunPresentation(run, modelNames)
            .filter((item) => item.key !== "mode" && item.key !== "status")
            .map((item) => item.value)
            .join(" · ") || "图片生成";
    const completed = results.length;
    const status = needsReviewCount
        ? `已完成 ${completed} 张 · ${needsReviewCount} 张待确认`
        : run?.status === "failed"
          ? "生成失败"
          : run?.status === "planning"
            ? "规划中"
            : run?.status === "running"
              ? "生成中"
              : run?.status === "paused"
                ? "已暂停"
                : `已完成 ${completed} 张`;
    const statusTone = needsReviewCount
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300"
        : run?.status === "failed"
          ? "border-red-200 bg-red-50 text-red-600 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-300"
          : run?.status === "completed"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300"
            : "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-500/10 dark:text-cyan-300";
    const fallbackRatio = task?.ratio || run?.generationPreferences?.image?.size || "1:1";
    const retry = async () => {
        if (!onRetry || retrying) return;
        setRetrying(true);
        try {
            await onRetry();
        } finally {
            setRetrying(false);
        }
    };

    return (
        <section data-testid="creative-image-task-panel" className="w-full max-w-[1120px]">
            <div data-testid="creative-image-task-header" className="mb-3 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="max-w-[min(62vw,620px)] truncate font-medium text-[#111827] dark:text-[#f5f7fa]" title={prompt}>
                    {prompt || "图片生成任务"}
                </span>
                <span className="text-[#98a2b3] dark:text-[#7f8996]">{compactMeta}</span>
                <span className={cn("rounded-md border px-2 py-0.5 text-xs font-semibold", statusTone)}>{status}</span>
                {timing}
            </div>
            <div data-testid="creative-image-result-grid" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {results.map((asset, index) => (
                    <CreativeImageCard key={asset.id} asset={asset} index={index} fallbackRatio={fallbackRatio} selected={selectedAssetIds.includes(asset.id)} onPreview={() => setPreviewIndex(index)} onToggleAsset={onToggleAsset} />
                ))}
                {Array.from({ length: missingCount }, (_, index) => (
                    <CreativeImagePlaceholder
                        key={`pending-${index}`}
                        ratio={fallbackRatio}
                        status={index < needsReviewCount ? "待人工确认" : placeholderStatus(run?.status)}
                        detail={index < needsReviewCount ? reviewReason : undefined}
                        waiting={index >= needsReviewCount && run?.status === "running"}
                    />
                ))}
            </div>
            {run?.status === "failed" && onRetry ? (
                <Button className="!mt-3 !h-8 !rounded-md" icon={<RefreshCw className="size-3.5" />} loading={retrying} onClick={() => void retry()}>
                    直接重试本次任务
                </Button>
            ) : null}
            <ImagePreviewModal assets={results} index={previewIndex} onClose={() => setPreviewIndex(undefined)} onChange={setPreviewIndex} />
        </section>
    );
}

function CreativeImageCard({ asset, index, fallbackRatio, selected, onPreview, onToggleAsset }: { asset: CreativeAsset; index: number; fallbackRatio: string; selected: boolean; onPreview: () => void; onToggleAsset?: (id: string) => void }) {
    const url = assetUrl(asset)!;
    const ratio = validDimensions(asset) ? `${asset.width} / ${asset.height}` : ratioCss(fallbackRatio);
    return (
        <article data-testid="creative-image-card" className="group min-w-0 overflow-hidden rounded-xl border border-[#e4e7ec] bg-white shadow-[0_8px_22px_rgba(15,23,42,0.06)] dark:border-[#343b44] dark:bg-[#181d23] dark:shadow-black/20">
            <div className="relative overflow-hidden bg-[#f5f6f8] dark:bg-[#20252c]" style={{ aspectRatio: ratio }}>
                <img src={imagePreviewUrl(url, 960)} alt={asset.title || `生成结果 ${index + 1}`} loading="lazy" className="size-full object-contain" />
                <span className="absolute left-2 top-2 rounded-md bg-black/65 px-1.5 py-1 text-[10px] font-semibold text-white">图片 {index + 1}</span>
                <div className="pointer-events-none absolute inset-x-2 bottom-2 flex translate-y-1 items-center justify-end gap-1 opacity-0 transition group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 focus-within:pointer-events-auto focus-within:translate-y-0 focus-within:opacity-100">
                    <Tooltip title="下载原图">
                        <Button
                            type="text"
                            size="small"
                            className="!grid !size-8 !place-items-center !rounded-md !bg-black/70 !p-0 !text-white hover:!bg-black/85"
                            icon={<Download className="size-3.5" />}
                            aria-label="下载原图"
                            onClick={() => downloadAgentMedia([{ type: "image", url, title: asset.title || `生成图片 ${index + 1}`, mimeType: asset.mimeType }])}
                        />
                    </Tooltip>
                    <Tooltip title="查看大图">
                        <Button type="text" size="small" className="!grid !size-8 !place-items-center !rounded-md !bg-black/70 !p-0 !text-white hover:!bg-black/85" icon={<Expand className="size-3.5" />} aria-label="查看大图" onClick={onPreview} />
                    </Tooltip>
                </div>
            </div>
            <div className="flex min-w-0 items-center gap-1.5 px-2.5 py-2">
                <span className="min-w-0 flex-1 truncate text-[11px] text-[#667085] dark:text-[#aab2bc]">{asset.width && asset.height ? `${asset.width}×${asset.height}` : fallbackRatio}</span>
                {onToggleAsset ? (
                    <Tooltip title={selected ? "取消引用" : "引用结果"}>
                        <button
                            type="button"
                            className={cn(
                                "grid size-7 shrink-0 place-items-center rounded-md text-[#667085] transition hover:bg-[#f2f4f7] hover:text-[#1f2937] dark:text-[#aab2bc] dark:hover:bg-[#252b33] dark:hover:text-white",
                                selected && "text-primary",
                            )}
                            aria-label={selected ? "取消引用结果" : "引用结果"}
                            aria-pressed={selected}
                            onClick={() => onToggleAsset(asset.id)}
                        >
                            <Link2 className="size-3.5" />
                        </button>
                    </Tooltip>
                ) : null}
            </div>
        </article>
    );
}

function CreativeImagePlaceholder({ ratio, status, detail, waiting }: { ratio: string; status: string; detail?: string; waiting?: boolean }) {
    return (
        <div
            data-testid="creative-image-placeholder"
            className="flex min-w-0 flex-col items-center justify-center rounded-xl border border-dashed border-[#d8dee6] bg-[#f8fafb] px-3 text-center text-xs text-[#8b949f] dark:border-[#3d4650] dark:bg-[#1c2127]"
            style={{ aspectRatio: ratioCss(ratio) }}
            title={detail}
        >
            <span className={cn("mb-2 size-6 rounded-full bg-cyan-200/80 dark:bg-cyan-400/20", waiting && "animate-pulse")} />
            <span>{status}</span>
            {detail ? <span className="mt-1 line-clamp-2 max-w-[220px] text-[10px] leading-4 text-amber-700 dark:text-amber-300">{detail}</span> : null}
        </div>
    );
}

function ImagePreviewModal({ assets, index, onClose, onChange }: { assets: CreativeAsset[]; index?: number; onClose: () => void; onChange: (index: number) => void }) {
    const active = index === undefined ? undefined : assets[index];
    const touchStartX = useRef<number | null>(null);
    useEffect(() => {
        if (index === undefined) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "ArrowLeft") onChange(Math.max(0, index - 1));
            if (event.key === "ArrowRight") onChange(Math.min(assets.length - 1, index + 1));
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [assets.length, index, onChange, onClose]);
    return (
        <Modal
            open={Boolean(active)}
            footer={null}
            centered
            width="min(1180px, calc(100vw - 20px))"
            closable={false}
            destroyOnHidden
            onCancel={onClose}
            styles={{ container: { padding: 0, overflow: "hidden", background: "#11151a" }, body: { padding: 0 } }}
        >
            {active ? (
                <div className="grid max-h-[90dvh] min-w-0 grid-cols-1 overflow-hidden bg-[#11151a] text-white lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div
                        className="relative flex min-h-[420px] min-w-0 flex-col items-center justify-center bg-black p-3 sm:p-5"
                        onTouchStart={(event) => {
                            touchStartX.current = event.changedTouches[0]?.clientX ?? null;
                        }}
                        onTouchEnd={(event) => {
                            const start = touchStartX.current;
                            touchStartX.current = null;
                            const end = event.changedTouches[0]?.clientX;
                            if (start === null || end === undefined || index === undefined || Math.abs(end - start) < 40) return;
                            onChange(end < start ? Math.min(assets.length - 1, index + 1) : Math.max(0, index - 1));
                        }}
                    >
                        <button type="button" className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-md bg-black/60 text-white hover:bg-black/80" onClick={onClose} aria-label="关闭预览">
                            <X className="size-4" />
                        </button>
                        {index !== undefined && index > 0 ? (
                            <button type="button" className="absolute left-3 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white hover:bg-black/80" onClick={() => onChange(index - 1)} aria-label="上一张">
                                <ChevronLeft className="size-5" />
                            </button>
                        ) : null}
                        {index !== undefined && index < assets.length - 1 ? (
                            <button type="button" className="absolute right-3 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white hover:bg-black/80" onClick={() => onChange(index + 1)} aria-label="下一张">
                                <ChevronRight className="size-5" />
                            </button>
                        ) : null}
                        <img src={imagePreviewUrl(assetUrl(active)!, 1920)} alt={active.title || "生成图片"} className="max-h-[68dvh] max-w-full object-contain" />
                        <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1">
                            {assets.map((asset, assetIndex) => (
                                <button
                                    key={asset.id}
                                    type="button"
                                    className={cn("size-14 shrink-0 overflow-hidden rounded-md border-2", assetIndex === index ? "border-cyan-400" : "border-white/15")}
                                    onClick={() => onChange(assetIndex)}
                                    aria-label={`查看第 ${assetIndex + 1} 张`}
                                >
                                    <img src={imagePreviewUrl(assetUrl(asset)!, 160)} alt="" className="size-full object-contain" />
                                </button>
                            ))}
                        </div>
                    </div>
                    <aside className="min-w-0 overflow-y-auto border-t border-white/10 bg-[#171c22] p-4 lg:border-l lg:border-t-0">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-white/60">图片详情</span>
                            <span className="text-xs text-white/60">
                                V{(index || 0) + 1}/{assets.length}
                            </span>
                        </div>
                        <h3 className="mt-3 break-words text-sm font-semibold">{active.title || "生成图片"}</h3>
                        <dl className="mt-4 space-y-3 text-xs">
                            <Detail label="尺寸" value={active.width && active.height ? `${active.width} × ${active.height}` : "按原图"} />
                            <Detail label="比例" value={active.width && active.height ? `${active.width}:${active.height}` : "未提供"} />
                            <Detail label="生成时间" value={formatTime(active.createdAt)} />
                            <Detail label="状态" value={active.status === "ready" ? "已完成" : active.status} />
                        </dl>
                        <Button className="!mt-5 !w-full" icon={<Download className="size-3.5" />} onClick={() => downloadAgentMedia([{ type: "image", url: assetUrl(active)!, title: active.title || "生成图片", mimeType: active.mimeType }])}>
                            下载原图
                        </Button>
                    </aside>
                </div>
            ) : null}
        </Modal>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-white/45">{label}</dt>
            <dd className="mt-0.5 break-words text-white/90">{value}</dd>
        </div>
    );
}
function assetUrl(asset: CreativeAsset) {
    return asset.serverUrl || asset.remoteUrl || "";
}
function validDimensions(asset: Pick<CreativeAsset, "width" | "height">) {
    const width = Number(asset.width);
    const height = Number(asset.height);
    return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;
}
function ratioCss(value: string) {
    const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*[:/x×*]\s*(\d+(?:\.\d+)?)$/i);
    return match ? `${Number(match[1])} / ${Number(match[2])}` : "1 / 1";
}
function formatTime(value: number) {
    try {
        return new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
    } catch {
        return "未知";
    }
}
function placeholderStatus(status: CreativeAgentRun["status"] | undefined) {
    return status === "failed" ? "失败" : status === "paused" ? "已暂停" : status === "planning" ? "规划中" : status === "completed" ? "后台保存中" : status === "cancelled" ? "已取消" : "生成中";
}
