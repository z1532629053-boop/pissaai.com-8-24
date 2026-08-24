"use client";

import type { MouseEvent, PointerEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { usePublicSessionStore } from "@/stores/use-public-session-store";
import { useUserStore } from "@/stores/use-user-store";

export function MnsEntryHome() {
    const router = useRouter();
    const [leaving, setLeaving] = useState(false);
    const [logoPulse, setLogoPulse] = useState(0);
    const sessionReady = usePublicSessionStore((state) => state.ready);
    const user = useUserStore((state) => state.user);
    const entryPath = sessionReady && user ? "/create" : "/login";

    function trackPointer(event: PointerEvent<HTMLElement>) {
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        event.currentTarget.style.setProperty("--mns-parallax-x", `${x * 24}px`);
        event.currentTarget.style.setProperty("--mns-parallax-y", `${y * 18}px`);
    }

    function resetPointer(event: PointerEvent<HTMLElement>) {
        event.currentTarget.style.setProperty("--mns-parallax-x", "0px");
        event.currentTarget.style.setProperty("--mns-parallax-y", "0px");
    }

    function enterWorkspace(event: MouseEvent<HTMLAnchorElement>) {
        event.preventDefault();
        if (leaving) return;

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            router.push(entryPath);
            return;
        }

        setLeaving(true);
        window.setTimeout(() => router.push(entryPath), 420);
    }

    return (
        <main
            data-smoke="marketing-home"
            className={`mns-entry-bg mns-page-enter app-scroll-page relative isolate flex h-[100dvh] min-h-[560px] overflow-hidden text-[#111820] ${leaving ? "mns-page-leave" : ""}`}
            onPointerMove={trackPointer}
            onPointerLeave={resetPointer}
        >
            <div className="mns-entry-sheen absolute inset-0 -z-20" aria-hidden="true" />
            <div className="mns-ambient-fields absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
                <span className="mns-ambient-field mns-ambient-field-cyan" />
                <span className="mns-ambient-field mns-ambient-field-sky" />
                <span className="mns-ambient-field mns-ambient-field-violet" />
            </div>

            <div className="mx-auto flex h-full w-full max-w-[1120px] flex-col items-center px-5 py-7 text-center sm:px-8 sm:py-9">
                <div className="flex w-full flex-1 flex-col items-center justify-center pb-12 pt-5 sm:pb-16">
                    <button
                        type="button"
                        aria-label="播放 MNS 品牌动效"
                        className="mns-home-logo mns-stagger-in relative block w-[min(84vw,510px)] select-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/55"
                        onClick={() => setLogoPulse((value) => value + 1)}
                    >
                        <span className="mns-logo-shimmer" aria-hidden="true" />
                        {logoPulse > 0 ? <span key={logoPulse} className="mns-logo-ripple" aria-hidden="true" /> : null}
                        <img src="/mns_logo.png" alt="MNS - Make No Surrender" width={1790} height={535} className="relative z-10 h-auto w-full" />
                    </button>

                    <h1 className="mns-stagger-in mns-stagger-title mt-12 max-w-[860px] text-[clamp(1.45rem,3.8vw,2.15rem)] font-black leading-[1.35] tracking-normal text-[#19232d] sm:mt-16">
                        一键制作，属于你自己的
                        <span className="mns-title-accent">产品图</span>
                        和
                        <span className="mns-title-accent mns-title-accent-video">产品视频</span>
                        。
                    </h1>
                    <p className="mns-stagger-in mns-stagger-subtitle mt-5 text-base font-medium tracking-normal text-[#667684] sm:text-lg">一个工作台，四条创作链路。</p>

                    <div className="mns-stagger-in mns-stagger-cta mt-9 w-full max-w-[450px] sm:mt-11">
                        <a
                            href={entryPath}
                            onClick={enterWorkspace}
                            aria-label="进入 MNS 工作台"
                            aria-disabled={leaving}
                            className="mns-home-cta group relative inline-flex h-16 w-full items-center justify-center gap-3 rounded-full bg-[#05070a] px-7 text-base font-black tracking-normal text-white shadow-[0_16px_40px_rgba(15,23,42,0.16)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#111820] hover:shadow-[0_20px_46px_rgba(15,23,42,0.22)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/60"
                        >
                            <span>进入 MNS 工作台</span>
                            <ArrowRight size={19} className="text-[#4ee2e7] transition-transform duration-300 group-hover:translate-x-[5px]" />
                        </a>
                    </div>
                </div>

                <p className="mns-stagger-in mns-stagger-footer shrink-0 text-[11px] font-bold uppercase tracking-[0.28em] text-[#52616c] sm:text-xs">MNS / Make No Surrender</p>
            </div>
        </main>
    );
}
