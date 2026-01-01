"use server";

import { prisma } from "@/lib/prisma";
import { experienceCardSelect, mapExperienceToCard } from "@/lib/experiences";
import type { Prisma } from "@/generated/prisma";

export type CarouselFilters = {
    countryId?: string;
    stateId?: string;
    cityId?: string;
    categoryId?: string;
    audience?: string; // "all" | "men" | "women" | "kids"
    tags?: string[];
    limit?: number;
};

export async function getCarouselExperiences(filters: CarouselFilters) {
    const where: Prisma.ExperienceWhereInput = {
        status: "PUBLISHED",
    };

    if (filters.countryId) {
        where.countryId = filters.countryId;
    }

    if (filters.stateId) {
        where.stateId = filters.stateId;
    }

    if (filters.cityId) {
        where.cityId = filters.cityId;
    }

    if (filters.categoryId) {
        where.categoryId = filters.categoryId;
    }

    if (filters.audience && filters.audience !== "all") {
        where.audience = filters.audience;
    }

    if (filters.tags && filters.tags.length > 0) {
        where.tags = {
            hasSome: filters.tags,
        };
    }

    const take = filters.limit ? Math.min(filters.limit, 20) : 10;

    const experiences = await prisma.experience.findMany({
        where,
        select: experienceCardSelect,
        orderBy: { createdAt: "desc" },
        take,
    });

    return experiences.map(mapExperienceToCard);
}
