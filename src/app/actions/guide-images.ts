"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import type { ImageStatus } from "@/generated/prisma";

export async function getGuideImagesAdmin(options?: {
    page?: number;
    limit?: number;
    status?: ImageStatus;
    guideId?: string;
}) {
    const session = await getServerAuthSession();
    const user = session?.user;
    if (!user || user.activeRole !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options?.status) {
        where.status = options.status;
    }
    if (options?.guideId) {
        where.guideId = options.guideId;
    }

    const [images, total] = await Promise.all([
        prisma.guideImage.findMany({
            where,
            include: {
                guide: {
                    select: {
                        title: true,
                        slug: true,
                    },
                },
            },
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
        }),
        prisma.guideImage.count({ where }),
    ]);

    return {
        images: images.map(img => ({
            ...img,
            latitude: img.latitude ? Number(img.latitude) : null,
            longitude: img.longitude ? Number(img.longitude) : null,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
}

export async function updateGuideImageMetadata(
    id: string,
    data: {
        alt?: string;
        caption?: string;
        status?: ImageStatus;
        latitude?: number | null;
        longitude?: number | null;
    }
) {
    const session = await getServerAuthSession();
    const user = session?.user;
    if (!user || user.activeRole !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    const image = await prisma.guideImage.update({
        where: { id },
        data: {
            alt: data.alt,
            caption: data.caption,
            status: data.status,
            latitude: data.latitude,
            longitude: data.longitude,
        },
    });

    revalidatePath("/admin/guides/gallery");
    return {
        ...image,
        latitude: image.latitude ? Number(image.latitude) : null,
        longitude: image.longitude ? Number(image.longitude) : null,
    };
}

export async function deleteGuideImage(id: string) {
    const session = await getServerAuthSession();
    const user = session?.user;
    if (!user || user.activeRole !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    await prisma.guideImage.delete({
        where: { id },
    });

    revalidatePath("/admin/guides/gallery");
}

export async function registerGuideImage(data: {
    url: string;
    width?: number;
    height?: number;
    size?: number;
    mimeType?: string;
    extension?: string;
    guideId?: string | null;
}) {
    const session = await getServerAuthSession();
    const user = session?.user;
    if (!user || user.activeRole !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    const image = await prisma.guideImage.create({
        data: {
            url: data.url,
            width: data.width,
            height: data.height,
            size: data.size,
            mimeType: data.mimeType,
            extension: data.extension,
            guideId: data.guideId || null,
            status: "APPROVED",
        },
    });

    revalidatePath("/admin/guides/gallery");
    return {
        ...image,
        latitude: image.latitude ? Number(image.latitude) : null,
        longitude: image.longitude ? Number(image.longitude) : null,
    };
}


