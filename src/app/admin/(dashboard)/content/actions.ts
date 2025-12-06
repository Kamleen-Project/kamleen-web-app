"use server";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function saveBanner(formData: FormData) {
    const session = await getServerAuthSession();
    if (session?.user?.role !== "ADMIN") return;

    const mobileImage = formData.get("mobileImage") as string;
    const desktopImage = formData.get("desktopImage") as string;
    const isActive = formData.get("isActive") === "on";

    const actionType = formData.get("actionType") as "LINK" | "MODAL";
    const linkUrl = formData.get("linkUrl") as string;
    const modalTitle = formData.get("modalTitle") as string;
    const modalContent = formData.get("modalContent") as string;
    const requiresAuth = formData.get("requiresAuth") === "on";

    await prisma.banner.upsert({
        where: { label: "home-hero" },
        update: {
            mobileImage,
            desktopImage,
            isActive,
            actionType,
            linkUrl,
            modalTitle,
            modalContent,
            requiresAuth,
        },
        create: {
            label: "home-hero",
            mobileImage,
            desktopImage,
            isActive,
            actionType,
            linkUrl,
            modalTitle,
            modalContent,
            requiresAuth,
        },
    });

    revalidatePath("/");
    revalidatePath("/admin/content");
}
