import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function MnsResultSurface({ children, className, header, grid = false }: { children: ReactNode; className?: string; header?: ReactNode; grid?: boolean }) {
    return (
        <section className={cn("mns-result-surface", className)}>
            <div className="mns-result-surface-glow" aria-hidden="true" />
            {header ? <div className="mns-result-surface-header">{header}</div> : null}
            <div className={cn("mns-result-surface-body", grid && "mns-result-surface-grid")}>{children}</div>
        </section>
    );
}

export function MnsResultCard({ children, className, ...props }: ComponentPropsWithoutRef<"article">) {
    return (
        <article {...props} className={cn("mns-result-card", className)}>
            {children}
        </article>
    );
}
