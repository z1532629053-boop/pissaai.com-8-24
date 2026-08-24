import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type MnsComposerShellProps = ComponentPropsWithoutRef<"div"> & {
    compact?: boolean;
};

export function MnsComposerShell({ children, className, compact = false, ...props }: MnsComposerShellProps) {
    return (
        <div {...props} className={cn("mns-composer-shell", compact && "mns-composer-shell-compact", className)}>
            <div className="mns-composer-shell-aurora" aria-hidden="true" />
            <div className="mns-composer-shell-sheen" aria-hidden="true" />
            <div className="mns-composer-shell-inner">{children}</div>
        </div>
    );
}
