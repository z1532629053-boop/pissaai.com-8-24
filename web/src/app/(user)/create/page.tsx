import { redirect } from "next/navigation";

export default async function LegacyCreatePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const params = await searchParams;
    const mode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
    const surface = Array.isArray(params.surface) ? params.surface[0] : params.surface;
    const destination = surface === "commerce" ? "/ecommerce" : mode === "image" ? "/image" : mode === "video" ? "/video" : "/agent";
    const conversationId = Array.isArray(params.conversationId) ? params.conversationId[0] : params.conversationId;
    redirect(conversationId ? `${destination}?conversationId=${encodeURIComponent(conversationId)}` : destination);
}
