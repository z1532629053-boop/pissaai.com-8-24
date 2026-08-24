import { afterEach, describe, expect, it, vi } from "vitest";

import { applyPublicSiteSettings, loadPublicSession, resetPublicSession, usePublicSessionStore } from "@/stores/use-public-session-store";

afterEach(() => {
    resetPublicSession();
    vi.unstubAllGlobals();
});

describe("public session refresh", () => {
    it("applies the administrator save response immediately while preserving the current session", () => {
        usePublicSessionStore.setState({
            ready: true,
            payload: { user: { id: "user-1" } as never, settings: { site: { title: "旧标题", logoUrl: "/old.svg" }, logicalModels: [] } },
        });

        applyPublicSiteSettings({ title: "新标题", logoUrl: "/new.svg" });

        expect(usePublicSessionStore.getState().payload).toMatchObject({
            user: { id: "user-1" },
            settings: { site: { title: "新标题", logoUrl: "/new.svg" }, logicalModels: [] },
        });
    });

    it("can replace a cached model catalog after an administrator saves settings", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(Response.json({ user: null, settings: { logicalModels: [] } }))
            .mockResolvedValueOnce(Response.json({ user: null, settings: { logicalModels: [{ id: "video-one", name: "视频一", capability: "video", enabled: true, bindings: [] }] } }));
        vi.stubGlobal("fetch", fetchMock);

        expect((await loadPublicSession()).settings?.logicalModels).toEqual([]);
        expect((await loadPublicSession()).settings?.logicalModels).toEqual([]);
        expect(fetchMock).toHaveBeenCalledTimes(1);

        const refreshed = await loadPublicSession({ force: true });

        expect(refreshed.settings?.logicalModels?.map((model) => model.id)).toEqual(["video-one"]);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(usePublicSessionStore.getState().payload).toEqual(refreshed);
    });

    it("keeps the authenticated refresh when an older anonymous request resolves later", async () => {
        let resolveAnonymous!: (response: Response) => void;
        const anonymousRequest = new Promise<Response>((resolve) => {
            resolveAnonymous = resolve;
        });
        const fetchMock = vi
            .fn()
            .mockReturnValueOnce(anonymousRequest)
            .mockResolvedValueOnce(Response.json({ user: { id: "user-1" }, settings: {} }));
        vi.stubGlobal("fetch", fetchMock);

        const staleRequest = loadPublicSession();
        const authenticatedRequest = loadPublicSession({ force: true });
        await authenticatedRequest;
        resolveAnonymous(Response.json({ user: null, settings: {} }));
        await staleRequest;

        expect(usePublicSessionStore.getState().payload?.user).toMatchObject({ id: "user-1" });
        expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/auth/session", { credentials: "include", cache: "no-store" });
    });
});
