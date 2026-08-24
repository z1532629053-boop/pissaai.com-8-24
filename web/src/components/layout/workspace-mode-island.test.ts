import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("workspace mode island", () => {
    it("adds the MNS desktop switcher without replacing the workspace shell", async () => {
        const [island, page, styles] = await Promise.all([
            readFile(resolve(process.cwd(), "src/components/layout/workspace-mode-island.tsx"), "utf8"),
            readFile(resolve(process.cwd(), "src/app/(user)/create/creative-workspace-page.tsx"), "utf8"),
            readFile(resolve(process.cwd(), "src/app/styles/global-mns-brand.css"), "utf8"),
        ]);

        expect(page).toContain("<WorkspaceModeIsland sidePanelOpen={historyOpen || assetsOpen} />");
        for (const label of ["电商 Agent", "电商生图", "电商套图", "电商视频"]) expect(island).toContain(label);
        expect(island).toContain('href: "/ecommerce"');
        expect(island).not.toContain('href: "/create?surface=commerce"');
        expect(island).toContain('params.set("recordId", activity.recordId)');
        expect(island).toContain('params.set("projectId", activity.projectId)');
        expect(island).toContain("activeMode === id");
        expect(island).toContain('modes.map(({ id, label, icon: Icon, href })');
        expect(island).toContain('<strong>{modeLabel}</strong>');
        expect(island).toContain('activities.find((activity) => activity.workspace === activeMode)');
        expect(island).toContain('!hasActivity && "mns-workspace-island-no-activity"');
        expect(island).toContain("mns-workspace-island-activity-enter");
        expect(island).toContain("currentActivity && expanded");
        expect(island).toContain('main.style.setProperty("--mns-workspace-island-space"');
        expect(island).toContain("new ResizeObserver(syncReservedSpace)");
        expect(styles).toContain(".mns-workspace-island-ring");
        expect(styles).toContain("mns-island-ring-breathe");
        expect(styles).toContain("width: min(760px, calc(100% - 32px));");
        expect(styles).toContain("min-width: 250px;");
        expect(styles).toContain(".mns-workspace-island-no-activity");
        expect(styles).toContain("mns-island-activity-enter");
        expect(styles).toContain("transition: width .32s");
    });
});
