import { createAgentRun, getAgentRun } from "@/lib/server/agent-run-store";
import { createCreativeConversation, getCreativeAssetsByIds, getCreativeConversation } from "@/lib/server/creative-runtime-store";
import { normalizeCreativeRunRequest } from "@/lib/creative-runtime-contract";
import { ecommerceCountTotal, EcommerceInputError, normalizeEcommerceCounts, type EcommerceCounts, type EcommerceProject } from "@/lib/ecommerce-contract";
import { addEcommerceVersion, createEcommerceProject, updateEcommerceProject } from "@/lib/server/ecommerce-project-store";

export async function createEcommerceProjectForUser(userId: string, value: unknown) {
    const input = object(value);
    const clientRequestId = text(input.clientRequestId, 120);
    const prompt = text(input.prompt, 4000);
    if (!clientRequestId) throw new EcommerceInputError("请求标识不能为空");
    if (!prompt) throw new EcommerceInputError("请先描述商品卖点和套图需求");
    const counts = normalizeEcommerceCounts(input.counts);
    const productAssetIds = ids(input.productAssetIds);
    if (!productAssetIds.length) throw new EcommerceInputError("请至少上传一张商品图片");
    const assets = await getCreativeAssetsByIds(productAssetIds, userId);
    if (assets.length !== productAssetIds.length || assets.some((asset) => asset.userId !== userId || asset.status !== "ready" || asset.type !== "image")) throw new EcommerceInputError("商品图片不存在、已失效或不是图片素材", 409);
    const conversationId = text(input.conversationId, 160);
    const existing = await createEcommerceProject({ userId, clientRequestId, prompt, counts, productAssetIds, conversationId });
    if (!existing.created) {
        if (!existing.project) throw new EcommerceInputError("电商项目不存在", 404);
        const run = existing.project.runId ? await getAgentRun(existing.project.runId) : undefined;
        return run ? { ...existing, run } : existing;
    }
    if (!existing.project) throw new EcommerceInputError("电商项目创建失败", 500);

    try {
        const conversation = conversationId ? await getOwnedEcommerceConversation(userId, conversationId) : await createCreativeConversation(userId, { surface: "chat", source: "ecommerce-workbench", title: prompt.slice(0, 48) });
        const runInput = normalizeCreativeRunRequest({
            clientRequestId: `${clientRequestId}:run`,
            surface: "chat",
            source: "ecommerce-workbench",
            conversationId: conversation.id,
            prompt: buildEcommerceExecutionPrompt(prompt, counts),
            publicPrompt: prompt,
            assetIds: productAssetIds,
            skillIds: ["ecommerce-image"],
            modelIds: [],
            preferences: { mode: "image", image: { count: ecommerceCountTotal(counts) } },
        });
        const run = await createAgentRun(userId, runInput);
        const project = await updateEcommerceProject(existing.project.id, userId, { conversationId: conversation.id, runId: run.run.id, status: "planning" });
        return { project: project || existing.project, conversation, run: run.run, created: true };
    } catch (error) {
        await updateEcommerceProject(existing.project.id, userId, { status: "failed" });
        throw error;
    }
}

export async function regenerateEcommerceItemForUser(userId: string, project: EcommerceProject, itemId: string, clientRequestId: string) {
    const item = project.items.find((candidate) => candidate.id === itemId);
    if (!item) throw new EcommerceInputError("套图项目项不存在", 404);
    const conversation = await getOwnedEcommerceConversation(userId, project.conversationId);
    const runInput = normalizeCreativeRunRequest({
        clientRequestId,
        surface: "chat",
        source: "ecommerce-workbench",
        conversationId: conversation.id,
        prompt: `${project.prompt}\n\n只重新生成${item.category === "square" ? "方图" : item.category === "pageMain" ? "长图" : "详情图"}第 ${item.ordinal} 张，比例固定为 ${item.ratio}，仅输出一张图片并保持商品外观一致。`,
        publicPrompt: `再次生成${item.category === "square" ? "方图" : item.category === "pageMain" ? "长图" : "详情图"}第 ${item.ordinal} 张`,
        assetIds: project.productAssetIds,
        skillIds: ["ecommerce-image"],
        modelIds: [],
        preferences: { mode: "image", image: { count: 1, size: item.ratio } },
    });
    const created = await createAgentRun(userId, runInput);
    const existingVersion = item.versions.find((version) => version.sourceRunId === created.run.id);
    const updated = existingVersion ? project : await addEcommerceVersion(project.id, userId, item.id, { sourceRunId: created.run.id, status: "running" });
    if (!updated) throw new EcommerceInputError("无法创建新版本", 409);
    return { project: updated, item: updated.items.find((candidate) => candidate.id === item.id), run: created.run, conversation, created: !existingVersion };
}

export async function editEcommerceItemForUser(userId: string, project: EcommerceProject, itemId: string, value: unknown) {
    const input = object(value);
    const clientRequestId = text(input.clientRequestId, 120);
    const sourceVersionId = text(input.sourceVersionId, 160);
    const instruction = text(input.instruction, 1200);
    const maskAssetId = text(input.maskAssetId, 160);
    if (!clientRequestId) throw new EcommerceInputError("请求标识不能为空");
    if (!instruction) throw new EcommerceInputError("请填写公开编辑指令");
    const item = project.items.find((candidate) => candidate.id === itemId);
    if (!item) throw new EcommerceInputError("套图项目项不存在", 404);
    const sourceVersion = item.versions.find((version) => version.id === sourceVersionId);
    if (!sourceVersion || sourceVersion.status !== "completed" || !sourceVersion.assetId) throw new EcommerceInputError("源版本不存在或尚未生成完成", 409);
    const assetIds = [sourceVersion.assetId, ...(maskAssetId ? [maskAssetId] : []), ...project.productAssetIds];
    const assets = await getCreativeAssetsByIds(assetIds, userId);
    if (assets.length !== new Set(assetIds).size || assets.some((asset) => asset.userId !== userId || asset.status !== "ready" || asset.type !== "image")) throw new EcommerceInputError("编辑素材不存在、已失效或不是图片", 409);
    const conversation = await getOwnedEcommerceConversation(userId, project.conversationId);
    const runInput = normalizeCreativeRunRequest({
        clientRequestId,
        surface: "chat",
        source: "ecommerce-workbench",
        conversationId: conversation.id,
        prompt: `${instruction}\n\n基于源版本图片进行局部编辑，保持商品主体、材质、颜色、Logo 和包装一致，比例固定为 ${item.ratio}，只输出一张图片。`,
        publicPrompt: instruction,
        assetIds: Array.from(new Set(assetIds)),
        skillIds: ["ecommerce-image"],
        modelIds: [],
        preferences: { mode: "image", image: { count: 1, size: item.ratio } },
    });
    const created = await createAgentRun(userId, runInput);
    const existingVersion = item.versions.find((version) => version.sourceRunId === created.run.id);
    const updated = existingVersion ? project : await addEcommerceVersion(project.id, userId, item.id, { sourceRunId: created.run.id, status: "running" });
    if (!updated) throw new EcommerceInputError("无法创建编辑版本", 409);
    return { project: updated, item: updated.items.find((candidate) => candidate.id === item.id), run: created.run, conversation, created: !existingVersion };
}

async function getOwnedEcommerceConversation(userId: string, id: string) {
    const conversation = await getCreativeConversation(id, userId);
    if (!conversation || conversation.source !== "ecommerce-workbench") throw new EcommerceInputError("电商创作会话不存在", 404);
    return conversation;
}

export function buildEcommerceExecutionPrompt(prompt: string, counts: EcommerceCounts) {
    const slots = [
        ...Array.from({ length: counts.square || 0 }, (_, index) => `square-${String(index + 1).padStart(2, "0")}｜方图第 ${index + 1} 张｜比例 1:1`),
        ...Array.from({ length: counts.pageMain || 0 }, (_, index) => `pageMain-${String(index + 1).padStart(2, "0")}｜长图第 ${index + 1} 张｜比例 3:4`),
        ...Array.from({ length: counts.detail || 0 }, (_, index) => `detail-${String(index + 1).padStart(2, "0")}｜详情图第 ${index + 1} 张｜比例 3:4`),
    ];
    return `${prompt}\n\n请严格按以下槽位分别生成，每个槽位只输出 1 张图片；任务标题必须包含槽位编号，例如 square-01、pageMain-01、detail-01，便于系统稳定回写结果。\n${slots.join("\n")}`;
}

function object(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown, max: number) {
    return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : "";
}

function ids(value: unknown) {
    return Array.from(new Set((Array.isArray(value) ? value : []).filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim().slice(0, 160))));
}

export type EcommerceCreateResult = Awaited<ReturnType<typeof createEcommerceProjectForUser>>;
export type EcommerceProjectWithRun = { project: EcommerceProject; run?: unknown; conversation?: unknown; created: boolean };
