
import { Suspense } from "react";
import { ConsolePage } from "@/components/console/page";
import { getGuideImagesAdmin } from "@/app/actions/guide-images";
import { GalleryClient } from "./gallery-client";

export default async function AdminGalleryPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; status?: string }>;
}) {
    const resolvedParams = await searchParams;
    const page = Number(resolvedParams.page) || 1;
    const status = resolvedParams.status as any; // Cast to ImageStatus if needed

    const data = await getGuideImagesAdmin({ page, limit: 20, status });

    return (
        <ConsolePage
            title="Gallery Manager"
            subtitle="Manage and moderate guide images."
        >
            <Suspense fallback={<div>Loading gallery...</div>}>
                <GalleryClient initialData={data} />
            </Suspense>
        </ConsolePage>
    );
}
