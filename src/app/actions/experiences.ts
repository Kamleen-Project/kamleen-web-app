"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import type { $Enums } from "@/generated/prisma";

export async function updateExperienceStatus(experienceId: string, status: $Enums.ExperienceStatus) {
    const session = await getServerAuthSession();
    if (!session?.user || session.user.activeRole !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    await prisma.experience.update({
        where: { id: experienceId },
        data: { status },
    });

    revalidatePath("/admin/experiences");
}

export async function updateExperienceReservationStatus(experienceId: string, status: $Enums.ReservationStatus) {
    const session = await getServerAuthSession();
    if (!session?.user || session.user.activeRole !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    await prisma.experience.update({
        where: { id: experienceId },
        data: { reservationStatus: status },
    });

    revalidatePath("/admin/experiences");
}
