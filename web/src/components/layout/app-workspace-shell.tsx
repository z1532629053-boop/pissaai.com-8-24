"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { isFullscreenWorkspacePath } from "@/components/layout/app-workspace-path";
import { navigationToolForPathname } from "@/constant/navigation-tools";

export function AppWorkspaceShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const tool = navigationToolForPathname(pathname);
    const fullscreen = isFullscreenWorkspacePath(pathname);

    if (fullscreen) return <div className="h-dvh min-h-0 overflow-hidden">{children}</div>;

    return (
        <div className="app-workspace-glass workspace-shell flex h-dvh min-h-0 overflow-hidden text-foreground">
            <AppSidebar activeToolSlug={tool?.slug} />
            <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
                <div className="app-workspace-content min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
            </div>
        </div>
    );
}
