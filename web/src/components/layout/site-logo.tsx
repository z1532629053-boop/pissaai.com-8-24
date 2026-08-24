"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

export function SiteLogo({ logoUrl, className }: { logoUrl: string; className?: string }) {
    const resolvedLogoUrl = logoUrl.trim();
    const customLogoUrl = resolvedLogoUrl && resolvedLogoUrl !== "/logo.svg" && resolvedLogoUrl !== "/icon.svg" && resolvedLogoUrl !== "/mns_logo.png" ? resolvedLogoUrl : "/mns_icon.png";
    const [failedLogoUrl, setFailedLogoUrl] = useState("");

    if (failedLogoUrl !== customLogoUrl) {
        return <img src={customLogoUrl} alt="" className={cn("shrink-0 object-contain", className)} referrerPolicy="no-referrer" onError={() => setFailedLogoUrl(customLogoUrl)} />;
    }

    return <img src="/mns_icon.png" alt="" className={cn("shrink-0 object-contain", className)} />;
}
