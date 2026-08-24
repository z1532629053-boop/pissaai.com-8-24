import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

import { createZip } from "@/lib/zip";
import { getCreativeAssetsByIds } from "@/lib/server/creative-runtime-store";
import { getLocalMediaRegistration } from "@/lib/server/local-media-registry";
import { GENERATION_MEDIA_ROOT, REFERENCE_MEDIA_ROOT } from "@/lib/server/local-media-storage";
import { getObjectBytes } from "@/lib/server/object-storage-client";
import { getObjectStorageRuntimeConfig } from "@/lib/server/object-storage-config";
import type { EcommerceProject } from "@/lib/ecommerce-contract";

export async function buildEcommerceProjectZip(project: EcommerceProject, userId: string) {
    const assetIds = project.items.flatMap((item) => item.versions.filter((version) => version.status === "completed" && version.assetId).map((version) => version.assetId as string));
    const assets = await getCreativeAssetsByIds(Array.from(new Set(assetIds)), userId);
    const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
    const files: Array<{ name: string; data: BlobPart }> = [];
    const manifest: Array<Record<string, unknown>> = [];

    for (const item of project.items) {
        for (const version of item.versions) {
            if (version.status !== "completed" || !version.assetId) continue;
            const asset = assetMap.get(version.assetId);
            if (!asset?.storageKey) {
                manifest.push({ itemId: item.id, category: item.category, ordinal: item.ordinal, version: version.version, status: "missing", reason: "媒体资产不存在" });
                continue;
            }
            const registration = await getLocalMediaRegistration(asset.storageKey);
            if (!registration || registration.ownerUserId !== userId) {
                manifest.push({ itemId: item.id, category: item.category, ordinal: item.ordinal, version: version.version, status: "missing", reason: "媒体资产不可读取" });
                continue;
            }
            try {
                const bytes = await readRegisteredMedia(registration);
                const extension = extensionFromMime(registration.mimeType, asset.storageKey);
                const name = `images/${item.category}-${String(item.ordinal).padStart(2, "0")}-v${version.version}.${extension}`;
                files.push({ name, data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer });
                manifest.push({ itemId: item.id, category: item.category, ordinal: item.ordinal, version: version.version, status: "included", assetId: asset.id, file: name });
            } catch (error) {
                manifest.push({ itemId: item.id, category: item.category, ordinal: item.ordinal, version: version.version, status: "missing", reason: error instanceof Error ? error.message : "媒体读取失败" });
            }
        }
    }

    const zip = await createZip([{ name: "manifest.json", data: JSON.stringify({ projectId: project.id, prompt: project.prompt, counts: project.counts, generatedAt: new Date().toISOString(), assets: manifest }, null, 2) }, ...files]);
    return { blob: zip, included: files.length, missing: manifest.filter((entry) => entry.status === "missing").length, manifest };
}

async function readRegisteredMedia(registration: { storageProvider?: string; externalObjectKey?: string; storageKey: string; scope: string }) {
    if (registration.storageProvider === "object" && registration.externalObjectKey) {
        const config = await getObjectStorageRuntimeConfig();
        return getObjectBytes(config, registration.externalObjectKey);
    }
    const root = registration.scope === "generation" ? GENERATION_MEDIA_ROOT : REFERENCE_MEDIA_ROOT;
    return new Uint8Array(await readFile(resolve(root, registration.storageKey)));
}

function extensionFromMime(mimeType: string, storageKey: string) {
    const match = mimeType.match(/\/(png|jpe?g|webp|gif)$/i);
    if (match) return match[1].toLowerCase().replace("jpeg", "jpg");
    return basename(storageKey).split(".").pop() || "bin";
}
