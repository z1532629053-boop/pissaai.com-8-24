import { randomUUID } from "node:crypto";

import { getDatabaseProvider, ensurePostgresSchema, postgresQuery, withPostgresTransaction } from "@/lib/server/database";
import { readJsonDataFile, withJsonDataFileLock, writeJsonDataFile } from "@/lib/server/data-adapter";
import {
    ecommerceCategories,
    ecommerceCategoryRatio,
    type EcommerceCategory,
    type EcommerceCounts,
    type EcommerceItemStatus,
    type EcommerceProject,
    type EcommerceProjectItem,
    type EcommerceProjectStatus,
    type EcommerceProjectVersion,
    type EcommerceVersionStatus,
} from "@/lib/ecommerce-contract";

const FILE = "ecommerce-projects.json";
type ExportRecord = { id: string; projectId: string; status: "pending" | "completed" | "failed"; storageKey?: string; error?: string; createdAt: number; updatedAt: number };
type EcommerceFileData = { projects: EcommerceProject[]; exports: ExportRecord[] };

export async function createEcommerceProject(input: { userId: string; clientRequestId: string; prompt: string; counts: EcommerceCounts; productAssetIds?: string[]; conversationId?: string; runId?: string }) {
    if (getDatabaseProvider() === "postgres") {
        await ensurePostgresSchema();
        const existing = await postgresQuery<Record<string, unknown>>("SELECT id FROM ecommerce_projects WHERE user_id = $1 AND client_request_id = $2 LIMIT 1", [input.userId, input.clientRequestId]);
        if (existing.rows[0]?.id) return { project: await getEcommerceProject(String(existing.rows[0].id), input.userId), created: false };
        const id = `ecommerce-${randomUUID()}`;
        const now = new Date();
        await withPostgresTransaction(async (client) => {
            await client.query("INSERT INTO ecommerce_projects (id, user_id, client_request_id, prompt, counts, status, product_asset_ids, created_at, updated_at) VALUES ($1,$2,$3,$4,$5::jsonb,'analyzing',$6::jsonb,$7,$7)", [
                id,
                input.userId,
                input.clientRequestId,
                input.prompt,
                JSON.stringify(input.counts),
                JSON.stringify(input.productAssetIds || []),
                now,
            ]);
            for (const category of ecommerceCategories) {
                for (let ordinal = 1; ordinal <= input.counts[category]; ordinal += 1) {
                    const itemId = `${id}-${category}-${ordinal}`;
                    const versionId = `${itemId}-v1`;
                    await client.query("INSERT INTO ecommerce_project_items (id, project_id, category, ordinal, ratio, current_version, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,1,$6,$6)", [
                        itemId,
                        id,
                        category,
                        ordinal,
                        ecommerceCategoryRatio(category),
                        now,
                    ]);
                    await client.query("INSERT INTO ecommerce_project_versions (id, item_id, version, status, created_at, updated_at) VALUES ($1,$2,1,'pending',$3,$3)", [versionId, itemId, now]);
                }
            }
        });
        return { project: await getEcommerceProject(id, input.userId), created: true };
    }
    return withJsonDataFileLock(FILE, async () => {
        const data = await readData();
        const existing = data.projects.find((project) => project.userId === input.userId && project.clientRequestId === input.clientRequestId);
        if (existing) return { project: existing, created: false };
        const now = Date.now();
        const id = `ecommerce-${randomUUID()}`;
        const items = ecommerceCategories.flatMap((category) =>
            Array.from({ length: input.counts[category] }, (_, index) => {
                const itemId = `${id}-${category}-${index + 1}`;
                const version: EcommerceProjectVersion = { id: `${itemId}-v1`, itemId, version: 1, status: "pending", createdAt: now, updatedAt: now };
                return { id: itemId, projectId: id, category, ordinal: index + 1, ratio: ecommerceCategoryRatio(category), status: "pending", currentVersion: 1, versions: [version], createdAt: now, updatedAt: now } satisfies EcommerceProjectItem;
            }),
        );
        const project: EcommerceProject = {
            id,
            userId: input.userId,
            clientRequestId: input.clientRequestId,
            conversationId: input.conversationId || "",
            runId: input.runId || "",
            prompt: input.prompt,
            counts: input.counts,
            status: "analyzing",
            productAssetIds: input.productAssetIds || [],
            items,
            createdAt: now,
            updatedAt: now,
        };
        data.projects.push(project);
        await writeData(data);
        return { project, created: true };
    });
}

export async function getEcommerceProject(id: string, userId: string) {
    if (getDatabaseProvider() === "postgres") {
        await ensurePostgresSchema();
        const [projectResult, itemResult, versionResult] = await Promise.all([
            postgresQuery<Record<string, unknown>>("SELECT * FROM ecommerce_projects WHERE id = $1 AND user_id = $2 LIMIT 1", [id, userId]),
            postgresQuery<Record<string, unknown>>("SELECT * FROM ecommerce_project_items WHERE project_id = $1 ORDER BY category, ordinal", [id]),
            postgresQuery<Record<string, unknown>>(
                "SELECT versions.* FROM ecommerce_project_versions versions JOIN ecommerce_project_items items ON items.id = versions.item_id JOIN ecommerce_projects projects ON projects.id = items.project_id WHERE projects.id = $1 AND projects.user_id = $2 ORDER BY versions.item_id, versions.version",
                [id, userId],
            ),
        ]);
        const project = projectResult.rows[0] ? mapProject(projectResult.rows[0]) : null;
        if (!project) return null;
        const versions = versionResult.rows.map(mapVersion);
        project.items = itemResult.rows.map((row) => ({ ...mapItem(row), versions: versions.filter((version) => version.itemId === String(row.id)) }));
        return project;
    }
    return (await readData()).projects.find((project) => project.id === id && project.userId === userId) || null;
}

export async function listEcommerceProjects(userId: string, limit = 30) {
    if (getDatabaseProvider() === "postgres") {
        await ensurePostgresSchema();
        const result = await postgresQuery<{ id: string }>("SELECT id FROM ecommerce_projects WHERE user_id = $1 ORDER BY updated_at DESC, id DESC LIMIT $2", [userId, Math.max(1, Math.min(100, limit))]);
        return (await Promise.all(result.rows.map((row) => getEcommerceProject(row.id, userId)))).filter((project): project is EcommerceProject => Boolean(project));
    }
    return (await readData()).projects
        .filter((project) => project.userId === userId)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, Math.max(1, Math.min(100, limit)));
}

export async function updateEcommerceProject(id: string, userId: string, patch: Partial<Pick<EcommerceProject, "conversationId" | "runId" | "status" | "productAssetIds">>) {
    if (getDatabaseProvider() === "postgres") {
        await ensurePostgresSchema();
        const fields: string[] = [];
        const values: unknown[] = [id, userId];
        for (const [key, value] of Object.entries(patch)) {
            const column = key === "conversationId" ? "conversation_id" : key === "runId" ? "run_id" : key === "productAssetIds" ? "product_asset_ids" : key;
            values.push(key === "productAssetIds" ? JSON.stringify(value) : value);
            fields.push(`${column} = $${values.length}${key === "productAssetIds" ? "::jsonb" : ""}`);
        }
        if (fields.length) {
            values.push(new Date());
            fields.push(`updated_at = $${values.length}`);
            await postgresQuery(`UPDATE ecommerce_projects SET ${fields.join(", ")} WHERE id = $1 AND user_id = $2`, values);
        }
        return getEcommerceProject(id, userId);
    }
    return withJsonDataFileLock(FILE, async () => {
        const data = await readData();
        const index = data.projects.findIndex((project) => project.id === id && project.userId === userId);
        if (index < 0) return null;
        data.projects[index] = { ...data.projects[index], ...patch, updatedAt: Date.now() };
        await writeData(data);
        return data.projects[index];
    });
}

export function reconcileEcommerceProjectState(
    project: EcommerceProject,
    run: { id: string; status: string; tasks: Array<{ id: string; title: string; status: string; assetIds?: string[]; error?: string; childTasks?: Array<{ status: string; error?: string }> }> },
) {
    const next = structuredClone(project);
    next.runId = run.id;
    const orderedTasks = [...run.tasks].filter((task) => task.status !== "cancelled");
    next.items.forEach((item) => {
        const label = item.category === "square" ? "方图" : item.category === "pageMain" ? "长图" : "详情图";
        const slotKey = `${item.category}-${String(item.ordinal).padStart(2, "0")}`;
        const task = orderedTasks.find((candidate) => taskMatchesSlot(candidate.title, item.category, item.ordinal, label, slotKey)) || orderedTasks[ecommerceCategories.indexOf(item.category)];
        const version = item.versions.find((candidate) => candidate.version === item.currentVersion) || item.versions[item.versions.length - 1];
        if (!task || !version) return;
        const childIndex = task.childTasks?.length === 1 || task.title.includes(slotKey) ? 0 : item.ordinal - 1;
        const assetId = task.assetIds?.[childIndex] || task.assetIds?.[item.ordinal - 1];
        const child = task.childTasks?.[childIndex] || task.childTasks?.[item.ordinal - 1];
        const failed = child?.status === "failed" || (task.status === "failed" && !assetId);
        version.sourceRunId = run.id;
        version.sourceTaskId = task.id;
        version.assetId = assetId;
        version.status = assetId ? "completed" : failed ? "failed" : task.status === "running" ? "running" : "pending";
        version.error = failed ? child?.error || task.error || "生成失败" : undefined;
        version.updatedAt = Date.now();
        item.status = version.status === "completed" ? "completed" : version.status === "failed" ? "failed" : version.status === "running" ? "running" : "pending";
        item.error = version.error;
        item.updatedAt = Date.now();
    });
    const statuses = next.items.map((item) => item.status);
    next.status =
        run.status === "failed" && statuses.every((status) => status === "failed")
            ? "failed"
            : statuses.some((status) => status === "failed") && statuses.some((status) => status === "completed")
              ? "partial"
              : statuses.every((status) => status === "completed")
                ? "completed"
                : run.status === "failed"
                  ? "partial"
                  : orderedTasks.length
                    ? "generating"
                    : "planning";
    next.updatedAt = Date.now();
    return next;
}

function taskMatchesSlot(title: string, category: string, ordinal: number, label: string, slotKey: string) {
    const normalized = title.toLowerCase();
    return normalized.includes(slotKey.toLowerCase()) || (title.includes(label) && (title.includes(`第 ${ordinal} 张`) || title.includes(`第${ordinal}张`) || title.includes(String(ordinal).padStart(2, "0"))));
}

export async function reconcileEcommerceProject(
    project: EcommerceProject,
    run: { id: string; status: string; tasks: Array<{ id: string; title: string; status: string; assetIds?: string[]; error?: string; childTasks?: Array<{ status: string; error?: string }> }> },
) {
    return replaceEcommerceProject(reconcileEcommerceProjectState(project, run));
}

export async function addEcommerceVersion(projectId: string, userId: string, itemId: string, input: { sourceRunId?: string; status?: EcommerceVersionStatus } = {}) {
    const project = await getEcommerceProject(projectId, userId);
    if (!project) return null;
    const item = project.items.find((candidate) => candidate.id === itemId);
    if (!item) return null;
    const now = Date.now();
    const version: EcommerceProjectVersion = { id: `${item.id}-v${item.currentVersion + 1}-${randomUUID()}`, itemId, version: item.currentVersion + 1, status: input.status || "pending", sourceRunId: input.sourceRunId, createdAt: now, updatedAt: now };
    item.currentVersion = version.version;
    item.versions.push(version);
    item.status = "running";
    item.error = undefined;
    project.status = "generating";
    project.updatedAt = now;
    return replaceEcommerceProject(project);
}

export async function replaceEcommerceProject(project: EcommerceProject) {
    if (getDatabaseProvider() === "postgres") {
        await ensurePostgresSchema();
        await withPostgresTransaction(async (client) => {
            await client.query("UPDATE ecommerce_projects SET conversation_id = $2, run_id = $3, status = $4, product_asset_ids = $5::jsonb, updated_at = $6 WHERE id = $1 AND user_id = $7", [
                project.id,
                project.conversationId,
                project.runId,
                project.status,
                JSON.stringify(project.productAssetIds),
                new Date(project.updatedAt),
                project.userId,
            ]);
            for (const item of project.items) {
                await client.query("UPDATE ecommerce_project_items SET status = $2, error = $3, current_version = $4, updated_at = $5 WHERE id = $1 AND project_id = $6", [
                    item.id,
                    item.status,
                    item.error || null,
                    item.currentVersion,
                    new Date(item.updatedAt),
                    project.id,
                ]);
                for (const version of item.versions) {
                    await client.query(
                        "INSERT INTO ecommerce_project_versions (id,item_id,version,status,asset_id,source_run_id,source_task_id,error,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, asset_id = EXCLUDED.asset_id, source_run_id = EXCLUDED.source_run_id, source_task_id = EXCLUDED.source_task_id, error = EXCLUDED.error, updated_at = EXCLUDED.updated_at",
                        [version.id, version.itemId, version.version, version.status, version.assetId || null, version.sourceRunId || null, version.sourceTaskId || null, version.error || null, new Date(version.createdAt), new Date(version.updatedAt)],
                    );
                }
            }
        });
        return project;
    }
    return withJsonDataFileLock(FILE, async () => {
        const data = await readData();
        const index = data.projects.findIndex((candidate) => candidate.id === project.id && candidate.userId === project.userId);
        if (index >= 0) data.projects[index] = project;
        else data.projects.push(project);
        await writeData(data);
        return project;
    });
}

export async function getLatestEcommerceExport(projectId: string, userId: string) {
    if (!(await getEcommerceProject(projectId, userId))) return null;
    if (getDatabaseProvider() === "postgres") {
        await ensurePostgresSchema();
        const result = await postgresQuery<Record<string, unknown>>("SELECT * FROM ecommerce_project_exports WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1", [projectId]);
        return result.rows[0] ? mapExport(result.rows[0]) : null;
    }
    return (await readData()).exports.filter((record) => record.projectId === projectId).sort((a, b) => b.createdAt - a.createdAt)[0] || null;
}

export async function createEcommerceExport(projectId: string, userId: string) {
    const project = await getEcommerceProject(projectId, userId);
    if (!project) return null;
    const record: ExportRecord = { id: `ecommerce-export-${randomUUID()}`, projectId, status: "completed", storageKey: `/api/ecommerce/projects/${projectId}/export/download`, createdAt: Date.now(), updatedAt: Date.now() };
    if (getDatabaseProvider() === "postgres") {
        await ensurePostgresSchema();
        await postgresQuery("INSERT INTO ecommerce_project_exports (id,project_id,status,storage_key,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$5)", [record.id, projectId, record.status, record.storageKey, new Date(record.createdAt)]);
    } else
        await withJsonDataFileLock(FILE, async () => {
            const data = await readData();
            data.exports.push(record);
            await writeData(data);
        });
    return record;
}

async function replaceData(data: EcommerceFileData) {
    await writeJsonDataFile(FILE, data);
    return data;
}
async function readData() {
    return readJsonDataFile<EcommerceFileData>(FILE, { projects: [], exports: [] });
}
async function writeData(data: EcommerceFileData) {
    return replaceData(data);
}

function mapExport(row: Record<string, unknown>): ExportRecord {
    return {
        id: String(row.id),
        projectId: String(row.project_id),
        status: row.status === "completed" || row.status === "failed" ? row.status : "pending",
        storageKey: text(row.storage_key),
        error: text(row.error),
        createdAt: databaseTime(row.created_at),
        updatedAt: databaseTime(row.updated_at),
    };
}

function mapProject(row: Record<string, unknown>): EcommerceProject {
    const counts = (row.counts && typeof row.counts === "object" ? row.counts : {}) as EcommerceCounts;
    return {
        id: String(row.id),
        userId: String(row.user_id),
        clientRequestId: String(row.client_request_id),
        conversationId: String(row.conversation_id || ""),
        runId: String(row.run_id || ""),
        prompt: String(row.prompt || ""),
        counts,
        status: isProjectStatus(row.status) ? row.status : "failed",
        productAssetIds: Array.isArray(row.product_asset_ids) ? row.product_asset_ids.map(String) : [],
        items: [],
        createdAt: databaseTime(row.created_at),
        updatedAt: databaseTime(row.updated_at),
    };
}
function mapItem(row: Record<string, unknown>): EcommerceProjectItem {
    return {
        id: String(row.id),
        projectId: String(row.project_id),
        category: isCategory(row.category) ? row.category : "square",
        ordinal: Number(row.ordinal) || 1,
        ratio: row.ratio === "3:4" ? "3:4" : "1:1",
        status: isItemStatus(row.status) ? row.status : "pending",
        error: text(row.error),
        currentVersion: Number(row.current_version) || 1,
        versions: [],
        createdAt: databaseTime(row.created_at),
        updatedAt: databaseTime(row.updated_at),
    };
}
function mapVersion(row: Record<string, unknown>): EcommerceProjectVersion {
    return {
        id: String(row.id),
        itemId: String(row.item_id),
        version: Number(row.version) || 1,
        status: isVersionStatus(row.status) ? row.status : "failed",
        assetId: text(row.asset_id),
        sourceRunId: text(row.source_run_id),
        sourceTaskId: text(row.source_task_id),
        error: text(row.error),
        createdAt: databaseTime(row.created_at),
        updatedAt: databaseTime(row.updated_at),
    };
}
function databaseTime(value: unknown) {
    const time = value instanceof Date ? value.getTime() : new Date(String(value || "")).getTime();
    return Number.isFinite(time) ? time : Date.now();
}
function text(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function isCategory(value: unknown): value is EcommerceCategory {
    return ecommerceCategories.includes(value as EcommerceCategory);
}
function isItemStatus(value: unknown): value is EcommerceItemStatus {
    return value === "pending" || value === "running" || value === "completed" || value === "failed";
}
function isVersionStatus(value: unknown): value is EcommerceVersionStatus {
    return value === "pending" || value === "running" || value === "completed" || value === "failed";
}
function isProjectStatus(value: unknown): value is EcommerceProjectStatus {
    return value === "analyzing" || value === "planning" || value === "generating" || value === "completed" || value === "partial" || value === "failed";
}
