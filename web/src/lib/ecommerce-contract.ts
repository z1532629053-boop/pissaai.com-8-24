export const ecommerceCategories = ["square", "pageMain", "detail"] as const;
export type EcommerceCategory = (typeof ecommerceCategories)[number];

export type EcommerceCounts = Record<EcommerceCategory, number>;
export type EcommerceProjectStatus = "analyzing" | "planning" | "generating" | "completed" | "partial" | "failed";
export type EcommerceItemStatus = "pending" | "running" | "completed" | "failed";
export type EcommerceVersionStatus = "pending" | "running" | "completed" | "failed";

export type EcommerceProjectVersion = {
    id: string;
    itemId: string;
    version: number;
    status: EcommerceVersionStatus;
    assetId?: string;
    sourceRunId?: string;
    sourceTaskId?: string;
    error?: string;
    createdAt: number;
    updatedAt: number;
};

export type EcommerceProjectItem = {
    id: string;
    projectId: string;
    category: EcommerceCategory;
    ordinal: number;
    ratio: "1:1" | "3:4";
    status: EcommerceItemStatus;
    error?: string;
    currentVersion: number;
    versions: EcommerceProjectVersion[];
    createdAt: number;
    updatedAt: number;
};

export type EcommerceProject = {
    id: string;
    userId: string;
    clientRequestId: string;
    conversationId: string;
    runId: string;
    prompt: string;
    counts: EcommerceCounts;
    status: EcommerceProjectStatus;
    productAssetIds: string[];
    items: EcommerceProjectItem[];
    createdAt: number;
    updatedAt: number;
};

export type EcommerceProjectSummary = Omit<EcommerceProject, "items"> & {
    completed: number;
    failed: number;
    total: number;
};

export const DEFAULT_ECOMMERCE_COUNTS: EcommerceCounts = { square: 1, pageMain: 5, detail: 10 };

export function normalizeEcommerceCounts(value: unknown): EcommerceCounts {
    const input = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    const counts = Object.fromEntries(ecommerceCategories.map((category) => [category, normalizeCount(input[category])])) as EcommerceCounts;
    const total = ecommerceCountTotal(counts);
    if (total < 1 || total > 40) throw new EcommerceInputError("生成总数必须为 1–40 张");
    return counts;
}

export function ecommerceCountTotal(counts: EcommerceCounts) {
    return ecommerceCategories.reduce((total, category) => total + counts[category], 0);
}

export function ecommerceCategoryLabel(category: EcommerceCategory) {
    return category === "square" ? "方图" : category === "pageMain" ? "长图" : "详情图";
}

export function ecommerceCategoryRatio(category: EcommerceCategory): EcommerceProjectItem["ratio"] {
    return category === "square" ? "1:1" : "3:4";
}

export class EcommerceInputError extends Error {
    constructor(
        message: string,
        public readonly status = 400,
    ) {
        super(message);
    }
}

function normalizeCount(value: unknown) {
    const count = Number(value);
    if (!Number.isSafeInteger(count) || count < 0 || count > 40) throw new EcommerceInputError("每类生成数量必须为 0–40 张");
    return count;
}
