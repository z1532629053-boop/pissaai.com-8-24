import type { EcommerceCounts, EcommerceProject } from "@/lib/ecommerce-contract";
import type { CreativeAgentRun } from "@/services/api/creative";
import type { CreativeConversation } from "@/lib/creative-runtime-contract";

async function request<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
    const response = await fetch(input, { ...init, credentials: "include" });
    const body = (await response.json()) as { code?: number; data?: T; msg?: string };
    if (!response.ok || body.code !== 0 || !body.data) throw new Error(body.msg || "电商请求失败");
    return body.data;
}

export function createEcommerceProject(input: { clientRequestId: string; prompt: string; counts: EcommerceCounts; productAssetIds: string[]; conversationId?: string }) {
    return request<{ project: EcommerceProject; conversation?: CreativeConversation; run?: CreativeAgentRun; created: boolean }>("/api/ecommerce/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });
}

export function listEcommerceProjects(limit = 30) {
    return request<{ projects: EcommerceProject[] }>(`/api/ecommerce/projects?limit=${limit}`);
}

export function getEcommerceProject(id: string) {
    return request<{ project: EcommerceProject }>(`/api/ecommerce/projects/${encodeURIComponent(id)}`);
}

export function regenerateEcommerceItem(projectId: string, itemId: string, clientRequestId: string) {
    return request<{ project: EcommerceProject; item: EcommerceProject["items"][number]; run: CreativeAgentRun; created: boolean }>(`/api/ecommerce/projects/${encodeURIComponent(projectId)}/items/${encodeURIComponent(itemId)}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientRequestId }),
    });
}

export function editEcommerceItem(projectId: string, itemId: string, input: { clientRequestId: string; sourceVersionId: string; instruction: string; maskAssetId?: string }) {
    return request<{ project: EcommerceProject; item: EcommerceProject["items"][number]; run: CreativeAgentRun; created: boolean }>(`/api/ecommerce/projects/${encodeURIComponent(projectId)}/items/${encodeURIComponent(itemId)}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });
}
