"use client";

import { ChevronRight, CircleHelp } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { SiteLogo } from "@/components/layout/site-logo";
import { navigationGroups, navigationTools, type NavigationToolSlug } from "@/constant/navigation-tools";
import { cn } from "@/lib/utils";
import { DEFAULT_SITE_TITLE, resolveSiteTitle } from "@/lib/site-brand";
import { usePublicSessionStore } from "@/stores/use-public-session-store";

export function AppSidebar({ activeToolSlug }: { activeToolSlug?: NavigationToolSlug }) {
    const pathname = usePathname();
    const router = useRouter();
    const site = usePublicSessionStore((state) => state.payload?.settings?.site) || { title: DEFAULT_SITE_TITLE, logoUrl: "/logo.svg" };
    const siteTitle = resolveSiteTitle(site.title);
    const helpActive = pathname.startsWith("/help");

    return (
        <aside className="app-workspace-sidebar hidden h-full w-[84px] shrink-0 flex-col text-[#111827] lg:flex dark:text-[#f3f5f7]">
            <Link href="/create" className="flex h-[76px] shrink-0 items-center justify-center" aria-label={siteTitle}>
                <SiteLogo logoUrl={site.logoUrl} className="size-8" />
            </Link>

            <nav className="hide-scrollbar flex min-h-0 flex-1 flex-col justify-center gap-5 overflow-y-auto px-2 py-5" aria-label="工作空间导航">
                {navigationGroups.map((group, groupIndex) => {
                    const tools = navigationTools.filter((tool) => tool.group === group.id);
                    return (
                        <div key={group.id} className={cn(groupIndex > 0 && "border-t border-black/[0.04] pt-5 dark:border-white/[0.06]")}>
                            <div className="space-y-2">
                                {tools.map((tool) => {
                                    const Icon = tool.icon;
                                    const active = tool.slug === activeToolSlug;
                                    const primary = "primary" in tool && tool.primary;
                                    return (
                                        <Link
                                            key={tool.slug}
                                            href={`/${tool.slug}`}
                                            prefetch
                                            title={tool.label}
                                            onMouseEnter={() => router.prefetch(`/${tool.slug}`)}
                                            onFocus={() => router.prefetch(`/${tool.slug}`)}
                                            className={cn(
                                                "group relative flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium transition-colors duration-150",
                                                active
                                                    ? "bg-white/72 text-[#111827] shadow-[0_8px_20px_rgba(15,23,42,0.08)] dark:bg-white/10 dark:text-[#f3f5f7]"
                                                    : primary
                                                      ? "text-[#111827] hover:bg-white/55 dark:text-[#d4d9df] dark:hover:bg-white/[0.08]"
                                                      : "text-[#66717c] hover:bg-white/55 dark:text-[#c7cdd5] dark:hover:bg-white/[0.08] dark:hover:text-[#f3f5f7]",
                                            )}
                                            aria-current={active ? "page" : undefined}
                                        >
                                            <Icon className={cn("size-[19px] shrink-0", active && "text-[#4f46e5] dark:text-[#b8bbff]")} />
                                            <span className="max-w-full truncate leading-4">{tool.label}</span>
                                            {active ? <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#565ccb] dark:bg-[#b8bbff]" /> : null}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </nav>

            <div className="shrink-0 px-2 pb-3 pt-3">
                <Link
                    href="/help"
                    prefetch
                    title="帮助"
                    onMouseEnter={() => router.prefetch("/help")}
                    onFocus={() => router.prefetch("/help")}
                    className={cn(
                        "relative flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium text-[#66717c] transition-colors duration-150 hover:bg-white/55 dark:text-[#c7cdd5] dark:hover:bg-white/[0.08] dark:hover:text-[#f3f5f7]",
                        helpActive && "bg-white/72 text-[#1d2127] shadow-[0_8px_20px_rgba(15,23,42,0.08)] dark:bg-white/10 dark:text-[#f3f5f7]",
                    )}
                    aria-current={helpActive ? "page" : undefined}
                >
                    <CircleHelp className="size-[18px] shrink-0" />
                    <span className="leading-4">帮助</span>
                    <ChevronRight className="absolute right-1 top-1/2 size-3 -translate-y-1/2 text-[#7f8995]" />
                    {helpActive ? <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#565ccb] dark:bg-[#b8bbff]" /> : null}
                </Link>
            </div>
        </aside>
    );
}
