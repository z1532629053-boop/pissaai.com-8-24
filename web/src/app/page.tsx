import { redirect } from "next/navigation";

import { getInstallStatus } from "@/lib/server/install-status";
import { MnsEntryHome } from "./home/mns-entry-home";

export const dynamic = "force-dynamic";

export default async function HomePage() {
    const install = await getInstallStatus();
    if (!install.ready) redirect("/install");

    return <MnsEntryHome />;
}
