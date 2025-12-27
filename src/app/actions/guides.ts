"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import type { GuideStatus, CommentStatus } from "@/generated/prisma";
import { type Guide } from "@/generated/prisma";

// --- Guides ---

export async function getGuidesAdmin(status?: GuideStatus) {
    const session = await getServerAuthSession();
    const user = session?.user;
    if (!user || user.activeRole !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    const where = status ? { status } : {};

    return prisma.guide.findMany({
        where,
        include: {
            author: {
                select: {
                    name: true,
                    email: true,
                    image: true,
                },
            },
            _count: {
                select: { comments: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });
}

export async function getGuideAdmin(id: string) {
    const session = await getServerAuthSession();
    const user = session?.user;
    if (!user || user.activeRole !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    return prisma.guide.findUnique({
        where: { id },
    });
}

export async function checkSlugUnique(slug: string, currentId?: string) {
    const session = await getServerAuthSession();
    const user = session?.user;
    if (!user || user.activeRole !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    const where: any = { slug };
    if (currentId) {
        where.id = { not: currentId };
    }

    const count = await prisma.guide.count({ where });
    return count === 0;
}

export async function createGuide(data: {
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    featuredImage?: string;
    tags?: string[];
    status?: GuideStatus;
    metaTitle?: string;
    metaDescription?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    countryId?: string;
    stateId?: string;
    cityId?: string;
}) {
    const session = await getServerAuthSession();
    const user = session?.user;
    if (!user || user.activeRole !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    const guide = await prisma.guide.create({
        data: {
            ...data,
            authorId: user.id,
            status: data.status ?? "DRAFT",
        },
    });

    revalidatePath("/admin/guides");
    revalidatePath("/guides");

    return {
        ...guide,
        latitude: guide.latitude ? Number(guide.latitude) : null,
        longitude: guide.longitude ? Number(guide.longitude) : null,
    };
}

export async function updateGuide(
    id: string,
    data: {
        title?: string;
        slug?: string;
        content?: string;
        excerpt?: string;
        featuredImage?: string | null;
        tags?: string[];
        status?: GuideStatus;
        metaTitle?: string;
        metaDescription?: string;
        publishedAt?: Date | null;
        address?: string | null;
        city?: string | null;
        state?: string | null;
        country?: string | null;
        latitude?: number | null;
        longitude?: number | null;
        countryId?: string | null;
        stateId?: string | null;
        cityId?: string | null;
    }
) {
    const session = await getServerAuthSession();
    const user = session?.user;
    if (!user || user.activeRole !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    let publishedAt = data.publishedAt;
    if (data.status === "PUBLISHED" && publishedAt === undefined) {
        const current = await prisma.guide.findUnique({ where: { id }, select: { publishedAt: true } });
        if (!current?.publishedAt) {
            publishedAt = new Date();
        }
    }

    const guide = await prisma.guide.update({
        where: { id },
        data: {
            ...data,
            publishedAt
        },
    });

    revalidatePath("/admin/guides");
    revalidatePath("/guides");
    revalidatePath(`/guides/${guide.slug}`);

    return {
        ...guide,
        latitude: guide.latitude ? Number(guide.latitude) : null,
        longitude: guide.longitude ? Number(guide.longitude) : null,
    };
}

export async function deleteGuide(id: string) {
    const session = await getServerAuthSession();
    const user = session?.user;
    if (!user || user.activeRole !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    await prisma.guide.delete({
        where: { id },
    });

    revalidatePath("/admin/guides");
}

export async function trashGuide(id: string) {
    return updateGuide(id, { status: "TRASHED" });
}

// --- Comments ---

export async function getCommentsAdmin(guideId?: string) {
    const session = await getServerAuthSession();
    const user = session?.user;
    if (!user || user.activeRole !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    const where = guideId ? { guideId } : {};

    return prisma.guideComment.findMany({
        where,
        include: {
            author: {
                select: { name: true, image: true, email: true },
            },
            guide: {
                select: { title: true, slug: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });
}

export async function updateCommentStatus(id: string, status: CommentStatus) {
    const session = await getServerAuthSession();
    const user = session?.user;
    if (!user || user.activeRole !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    const comment = await prisma.guideComment.update({
        where: { id },
        data: { status },
    });

    revalidatePath("/admin/guides/comments");
    return comment;
}

export async function deleteComment(id: string) {
    const session = await getServerAuthSession();
    const user = session?.user;
    if (!user || user.activeRole !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    await prisma.guideComment.delete({
        where: { id },
    });

    revalidatePath("/admin/guides/comments");
}

// --- Public ---

export async function getPublishedGuides(page = 1, limit = 10, tag?: string) {
    const where: any = {
        status: "PUBLISHED",
    };
    if (tag) {
        where.tags = { has: tag };
    }

    const guides = await prisma.guide.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { publishedAt: "desc" },
        include: {
            author: { select: { name: true, image: true } },
            _count: { select: { comments: { where: { status: "APPROVED" } } } }
        }
    });

    const total = await prisma.guide.count({ where });

    return { guides, total, pages: Math.ceil(total / limit) };
}

export async function getGuideBySlug(slug: string) {
    const session = await getServerAuthSession();
    const isAdmin = session?.user?.activeRole === "ADMIN";

    const where: any = { slug };
    if (!isAdmin) {
        where.status = "PUBLISHED";
    }

    return prisma.guide.findUnique({
        where,
        include: {
            author: { select: { name: true, image: true, bio: true } },
            comments: {
                where: { status: "APPROVED" },
                include: { author: { select: { name: true, image: true } } },
                orderBy: { createdAt: "desc" }
            }
        }
    });
}

export async function getAdjacentGuides(currentId: string, publishedAt: Date) {
    const next = await prisma.guide.findFirst({
        where: {
            status: "PUBLISHED",
            publishedAt: { gt: publishedAt },
        },
        orderBy: { publishedAt: "asc" },
        select: { title: true, slug: true },
    });

    const prev = await prisma.guide.findFirst({
        where: {
            status: "PUBLISHED",
            publishedAt: { lt: publishedAt },
        },
        orderBy: { publishedAt: "desc" },
        select: { title: true, slug: true },
    });

    return { next, prev };
}

export async function getRelatedGuides(slug: string, tags: string[], limit = 3) {
    return prisma.guide.findMany({
        where: {
            status: "PUBLISHED",
            slug: { not: slug },
            tags: { hasSome: tags },
        },
        take: limit,
        orderBy: { publishedAt: "desc" },
        include: {
            author: { select: { name: true, image: true } },
        }
    });
}

export async function createComment(guideId: string, content: string) {
    const session = await getServerAuthSession();
    const user = session?.user;
    if (!user) {
        throw new Error("Must be logged in to comment");
    }

    const comment = await prisma.guideComment.create({
        data: {
            content,
            guideId,
            authorId: user.id,
            status: "APPROVED",
        }
    });

    return comment;
}
