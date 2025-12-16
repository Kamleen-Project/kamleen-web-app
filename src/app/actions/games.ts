"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { GameType, GameEvent, GamePrize, Coupon } from "@/generated/prisma";

// Types
export type GameEventWithPrizes = GameEvent & {
    prizes: (GamePrize & {
        coupon: Coupon;
    })[];
};

export type CreateGameEventInput = {
    type: GameType;
    title: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    isActive: Boolean;
    prizes: {
        couponId: string;
        odds: number;
        label?: string;
        color?: string;
    }[];
};

export async function getAllGameEvents() {
    try {
        const events = await prisma.gameEvent.findMany({
            include: {
                prizes: {
                    include: {
                        coupon: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        return { success: true, events };
    } catch (error) {
        console.error("Error fetching game events:", error);
        return { success: false, error: "Failed to fetch game events" };
    }
}

export async function createGameEvent(data: CreateGameEventInput) {
    try {
        const event = await prisma.gameEvent.create({
            data: {
                type: data.type,
                title: data.title,
                description: data.description,
                startDate: data.startDate,
                endDate: data.endDate,
                isActive: !!data.isActive,
                prizes: {
                    create: data.prizes.map((p) => ({
                        couponId: p.couponId,
                        odds: p.odds,
                        label: p.label,
                        color: p.color,
                    })),
                },
            },
        });

        revalidatePath("/admin/games");
        return { success: true, event };
    } catch (error) {
        console.error("Error creating game event:", error);
        return { success: false, error: "Failed to create game event" };
    }
}

export async function updateGameEvent(id: string, data: CreateGameEventInput) {
    try {
        // Delete existing prizes and create new ones
        await prisma.gamePrize.deleteMany({
            where: { gameEventId: id },
        });

        const event = await prisma.gameEvent.update({
            where: { id },
            data: {
                type: data.type,
                title: data.title,
                description: data.description,
                startDate: data.startDate,
                endDate: data.endDate,
                isActive: !!data.isActive,
                prizes: {
                    create: data.prizes.map((p) => ({
                        couponId: p.couponId,
                        odds: p.odds,
                        label: p.label,
                        color: p.color,
                    })),
                },
            },
        });

        revalidatePath("/admin/games");
        return { success: true, event };
    } catch (error) {
        console.error("Error updating game event:", error);
        return { success: false, error: "Failed to update game event" };
    }
}

export async function deleteGameEvent(id: string) {
    try {
        await prisma.gameEvent.delete({
            where: { id },
        });

        revalidatePath("/admin/games");
        return { success: true };
    } catch (error) {
        console.error("Error deleting game event:", error);
        return { success: false, error: "Failed to delete game event" };
    }
}

export async function toggleGameEventStatus(id: string, isActive: boolean) {
    try {
        await prisma.gameEvent.update({
            where: { id },
            data: { isActive },
        })
        revalidatePath("/admin/games")
        return { success: true }
    } catch (error) {
        return { success: false, error: "Failed to update status" }
    }
}
