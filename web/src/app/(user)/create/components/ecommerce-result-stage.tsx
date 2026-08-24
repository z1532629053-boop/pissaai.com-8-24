"use client";

import { App, Button, Input, Modal, Tooltip } from "antd";
import { ChevronLeft, ChevronRight, Download, Expand, FileArchive, Pencil, RefreshCw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { downloadAgentMedia } from "@/components/agent/agent-media-download";
import { MnsResultSurface } from "@/components/mns/mns-result-surface";
import { ecommerceCategories, ecommerceCategoryLabel, type EcommerceCategory, type EcommerceProject } from "@/lib/ecommerce-contract";
import type { CreativeAsset } from "@/lib/creative-runtime-contract";
import { imagePreviewUrl } from "@/lib/media-image-url";
import { editEcommerceItem, regenerateEcommerceItem } from "@/services/api/ecommerce-projects";

export function EcommerceResultStage({ project, assets, onProjectChange }: { project?: EcommerceProject; assets: CreativeAsset[]; onProjectChange: (project: EcommerceProject) => void }) {
    const { message } = App.useApp();
    const [activeCategory, setActiveCategory] = useState<EcommerceCategory>("square");
    const [preview, setPreview] = useState<{ itemId: string; versionIndex: number }>();
    const [editing, setEditing] = useState<{ itemId: string; versionId: string }>();
    const [instruction, setInstruction] = useState("");
    const assetMap = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);
    if (!project) return null;
    const run = async (action: () => Promise<{ project: EcommerceProject }>) => {
        try { const result = await action(); onProjectChange(result.project); message.success("任务已提交"); } catch (error) { message.error(error instanceof Error ? error.message : "操作失败"); }
    };
    const activeItems = project.items.filter((item) => item.category === activeCategory);
    const completed = project.items.filter((item) => item.status === "completed").length;
    const failed = project.items.filter((item) => item.status === "failed").length;
    const activePreviewItem = preview ? project.items.find((item) => item.id === preview.itemId) : undefined;
    const activePreviewVersion = activePreviewItem?.versions[preview?.versionIndex || 0];
    const previewItems = project.items.filter((item) => item.category === activeCategory && item.versions.some((version) => version.assetId && assetMap.has(version.assetId)));

    return (
        <MnsResultSurface className="mx-auto mt-4 w-full max-w-[1240px] shrink-0 px-1 pb-4" aria-label="电商套图结果" header={<div className="flex flex-wrap items-start justify-between gap-3 px-1">
            <div><h2 className="text-base font-semibold text-[#20242a] dark:text-white">电商套图项目</h2><p className="mt-1 text-xs text-[#8b949f]">{completed}/{project.items.length} 个槽位已完成{failed ? ` · ${failed} 个失败` : ""}</p></div>
            <div className="flex flex-wrap gap-2"><Button size="small" icon={<FileArchive className="size-3.5" />} href={`/api/ecommerce/projects/${encodeURIComponent(project.id)}/export/download`}>下载全部 ZIP</Button></div>
        </div>}>
            <div className="mb-4 flex min-w-0 gap-1 overflow-x-auto border-b border-[#e6e9ed] px-1 dark:border-[#303740]">
                {ecommerceCategories.map((category) => { const items = project.items.filter((item) => item.category === category); const count = items.filter((item) => item.status === "completed").length; return <button key={category} type="button" className={`relative shrink-0 px-3 py-2.5 text-sm font-medium transition ${activeCategory === category ? "text-primary" : "text-[#667085] hover:text-[#20242a] dark:text-[#aab2bc] dark:hover:text-white"}`} onClick={() => setActiveCategory(category)}>{ecommerceCategoryLabel(category)} <span className="ml-1 text-xs text-current/65">{count}/{items.length}</span>{activeCategory === category ? <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" /> : null}</button>; })}
            </div>
            <div data-testid="ecommerce-result-grid" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {activeItems.map((item) => <EcommerceItemCard key={item.id} item={item} assetMap={assetMap} onPreview={(versionIndex) => setPreview({ itemId: item.id, versionIndex })} onRegenerate={() => void run(() => regenerateEcommerceItem(project.id, item.id, `${project.id}:${item.id}:regenerate:${Date.now()}`))} onEdit={(version) => { setEditing({ itemId: item.id, versionId: version.id }); setInstruction(""); }} />)}
            </div>
            {activeItems.length === 0 ? <div className="py-12 text-center text-sm text-[#8b949f]">当前分类暂无任务</div> : null}
            <EcommercePreviewModal items={previewItems} selectedItem={activePreviewItem} selectedVersion={activePreviewVersion} assetMap={assetMap} onClose={() => setPreview(undefined)} onChange={(itemId, versionIndex) => setPreview({ itemId, versionIndex })} />
            <Modal open={Boolean(editing)} title="局部编辑" okText="提交编辑" cancelText="取消" onCancel={() => setEditing(undefined)} onOk={() => { if (!editing) return; void run(async () => { const result = await editEcommerceItem(project.id, editing.itemId, { clientRequestId: `${project.id}:${editing.itemId}:edit:${Date.now()}`, sourceVersionId: editing.versionId, instruction }); setEditing(undefined); return result; }); }}><Input.TextArea value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="例如：将背景改为浅灰，保留商品主体和 Logo" rows={4} maxLength={1200} /></Modal>
        </MnsResultSurface>
    );
}

function EcommerceItemCard({ item, assetMap, onPreview, onRegenerate, onEdit }: { item: EcommerceProject["items"][number]; assetMap: ReadonlyMap<string, CreativeAsset>; onPreview: (versionIndex: number) => void; onRegenerate: () => void; onEdit: (version: EcommerceProject["items"][number]["versions"][number]) => void }) {
    const [versionIndex, setVersionIndex] = useState(Math.max(0, item.versions.findIndex((version) => version.version === item.currentVersion)));
    useEffect(() => { setVersionIndex(Math.max(0, item.versions.findIndex((version) => version.version === item.currentVersion))); }, [item.currentVersion, item.versions]);
    const version = item.versions[versionIndex] || item.versions.at(-1);
    const asset = version?.assetId ? assetMap.get(version.assetId) : undefined;
    const url = asset ? asset.serverUrl || asset.remoteUrl : undefined;
    return <article data-testid="ecommerce-item-card" className="group min-w-0 overflow-hidden rounded-xl border border-[#e4e7ec] bg-white shadow-[0_8px_22px_rgba(15,23,42,0.05)] dark:border-[#343b44] dark:bg-[#181d23] dark:shadow-black/20"><div className="relative overflow-hidden bg-[#f5f6f8] dark:bg-[#20252c]" style={{ aspectRatio: item.ratio.replace(":", " / ") }}>{url ? <img src={imagePreviewUrl(url, 800)} alt={`${ecommerceCategoryLabel(item.category)}第${item.ordinal}张`} loading="lazy" className="size-full object-contain" /> : <div className="flex size-full items-center justify-center px-2 text-center text-xs text-[#8b949f]">{item.status === "failed" ? item.error || "生成失败" : item.status === "running" ? "生成中" : "等待生成"}</div>}<span className="absolute left-2 top-2 rounded-md bg-black/65 px-1.5 py-1 text-[10px] font-semibold text-white">{version ? `V${version.version}/${item.versions.length}` : `第${item.ordinal}张`}</span><div className="pointer-events-none absolute inset-x-2 bottom-2 flex translate-y-1 items-center justify-end gap-1 opacity-0 transition group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 focus-within:pointer-events-auto focus-within:translate-y-0 focus-within:opacity-100"><Tooltip title="下载"><Button type="text" size="small" className="!grid !size-8 !place-items-center !rounded-md !bg-black/70 !p-0 !text-white" disabled={!url} icon={<Download className="size-3.5" />} aria-label="下载图片" onClick={() => url && downloadAgentMedia([{ type: "image", url, title: `${item.category}-${item.ordinal}`, mimeType: asset?.mimeType }])} /></Tooltip><Tooltip title="预览"><Button type="text" size="small" className="!grid !size-8 !place-items-center !rounded-md !bg-black/70 !p-0 !text-white" disabled={!url} icon={<Expand className="size-3.5" />} aria-label="预览图片" onClick={() => onPreview(versionIndex)} /></Tooltip><Tooltip title="再次生成"><Button type="text" size="small" className="!grid !size-8 !place-items-center !rounded-md !bg-black/70 !p-0 !text-white" icon={<RefreshCw className="size-3.5" />} aria-label="再次生成" onClick={onRegenerate} /></Tooltip></div></div><div className="flex min-w-0 items-center gap-1 px-2 py-1.5"><span className="min-w-0 flex-1 truncate text-[11px] text-[#667085] dark:text-[#aab2bc]">第 {item.ordinal} 张 · {item.ratio}</span>{version?.assetId ? <Tooltip title="局部编辑"><Button type="text" size="small" className="!grid !size-7 !place-items-center !p-0" icon={<Pencil className="size-3.5" />} aria-label="局部编辑" onClick={() => onEdit(version)} /></Tooltip> : null}</div>{item.versions.length > 1 ? <div className="flex items-center justify-between border-t border-[#eef0f2] px-2 py-1 dark:border-[#2c333b]"><button type="button" className="grid size-6 place-items-center rounded text-[#667085] disabled:opacity-30" disabled={versionIndex <= 0} onClick={() => setVersionIndex((value) => Math.max(0, value - 1))} aria-label="上一版本"><ChevronLeft className="size-3.5" /></button><span className="text-[10px] text-[#667085]">版本 {versionIndex + 1}/{item.versions.length}</span><button type="button" className="grid size-6 place-items-center rounded text-[#667085] disabled:opacity-30" disabled={versionIndex >= item.versions.length - 1} onClick={() => setVersionIndex((value) => Math.min(item.versions.length - 1, value + 1))} aria-label="下一版本"><ChevronRight className="size-3.5" /></button></div> : null}</article>;
}

function EcommercePreviewModal({ items, selectedItem, selectedVersion, assetMap, onClose, onChange }: { items: EcommerceProject["items"]; selectedItem?: EcommerceProject["items"][number]; selectedVersion?: EcommerceProject["items"][number]["versions"][number]; assetMap: ReadonlyMap<string, CreativeAsset>; onClose: () => void; onChange: (itemId: string, versionIndex: number) => void }) {
    const selectedAsset = selectedVersion?.assetId ? assetMap.get(selectedVersion.assetId) : undefined;
    const url = selectedAsset?.serverUrl || selectedAsset?.remoteUrl;
    const itemIndex = selectedItem ? items.findIndex((item) => item.id === selectedItem.id) : -1;
    useEffect(() => { if (!selectedItem) return; const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); if (event.key === "ArrowLeft" && itemIndex > 0) onChange(items[itemIndex - 1].id, 0); if (event.key === "ArrowRight" && itemIndex >= 0 && itemIndex < items.length - 1) onChange(items[itemIndex + 1].id, 0); }; window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown); }, [itemIndex, items, onChange, onClose, selectedItem]);
    return <Modal open={Boolean(selectedItem && url)} footer={null} centered width="min(1180px, calc(100vw - 20px))" closable={false} destroyOnHidden onCancel={onClose} styles={{ container: { padding: 0, overflow: "hidden", background: "#11151a" }, body: { padding: 0 } }}>{selectedItem && url ? <div className="grid max-h-[90dvh] min-w-0 grid-cols-1 overflow-hidden bg-[#11151a] text-white lg:grid-cols-[minmax(0,1fr)_280px]"><div className="relative flex min-h-[420px] min-w-0 items-center justify-center bg-black p-4"><button type="button" className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-md bg-black/60" onClick={onClose} aria-label="关闭预览"><X className="size-4" /></button><img src={imagePreviewUrl(url, 1920)} alt={`${ecommerceCategoryLabel(selectedItem.category)}第${selectedItem.ordinal}张`} className="max-h-[76dvh] max-w-full object-contain" /></div><aside className="border-t border-white/10 bg-[#171c22] p-4 lg:border-l lg:border-t-0"><div className="flex items-center justify-between text-xs text-white/60"><span>{ecommerceCategoryLabel(selectedItem.category)} · 第 {selectedItem.ordinal} 张</span><span>V{selectedVersion?.version}</span></div><dl className="mt-4 space-y-3 text-xs"><div><dt className="text-white/45">比例</dt><dd className="mt-0.5">{selectedItem.ratio}</dd></div><div><dt className="text-white/45">尺寸</dt><dd className="mt-0.5">{selectedAsset?.width && selectedAsset.height ? `${selectedAsset.width} × ${selectedAsset.height}` : "按原图"}</dd></div><div><dt className="text-white/45">状态</dt><dd className="mt-0.5">{selectedItem.status === "completed" ? "已完成" : selectedItem.status}</dd></div></dl><Button className="!mt-5 !w-full" icon={<Download className="size-3.5" />} onClick={() => downloadAgentMedia([{ type: "image", url, title: `${selectedItem.category}-${selectedItem.ordinal}`, mimeType: selectedAsset?.mimeType }])}>下载原图</Button></aside></div> : null}</Modal>;
}
