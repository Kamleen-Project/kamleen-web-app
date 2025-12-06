import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { ContentForm } from "./content-form";

export default async function ContentPage() {
    const session = await getServerAuthSession();
    if (!session?.user || session.user.role !== "ADMIN") {
        redirect("/admin/login");
    }

    const existingBanner = await prisma.banner.findUnique({
        where: { label: "home-hero" },
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Content Management</h1>
                    <p className="text-muted-foreground">Manage site banners and featured content.</p>
                </div>
            </div>

            <div className="max-w-4xl space-y-8">
                <ContentForm initialBanner={existingBanner} />
            </div>
        </div>
    );
}
