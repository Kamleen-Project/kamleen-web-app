"use client";

import { useState, useMemo } from "react";
import { Play } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";
import { CtaIconButton } from "@/components/ui/cta-icon-button";
import { RouletteGame, RoulettePrize } from "@/components/games/roulette-game";
import type { GameEventWithPrizes } from "@/app/actions/games";
import { GameType } from "@/generated/prisma";

interface PreviewGameModalProps {
    gameEvent: GameEventWithPrizes;
}

export function PreviewGameModal({ gameEvent }: PreviewGameModalProps) {
    const [open, setOpen] = useState(false);
    const [lastWin, setLastWin] = useState<string | null>(null);

    const prizes: RoulettePrize[] = useMemo(() => gameEvent.prizes.map((p) => ({
        id: p.id,
        label: p.label || p.coupon.code,
        odds: p.odds,
        color: p.color || "#000000",
        remainingCount: p.coupon.maxUses ? p.coupon.maxUses - p.coupon.usedCount : null,
        // We don't expose coupon details securely here but it's admin preview
    })), [gameEvent]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <CtaIconButton
                    color="whiteBorder"
                    size="sm"
                    aria-label="Preview Game"
                    className="text-primary"
                    children={<Play className="size-4" />}
                />
            </DialogTrigger>
            <DialogContent fullHeight className="w-screen h-[100dvh] top-0 left-0 translate-x-0 translate-y-0 sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 max-w-none rounded-none flex flex-col p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle>Preview: {gameEvent.title}</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center h-[660px] md:h-[820px] py-4 -m-3 md:m-0">
                    {gameEvent.type === GameType.ROULETTE ? (
                        <RouletteGame
                            prizes={prizes}
                            onSpinEnd={(prize) => setLastWin(prize ? prize.label : "Try Again")}
                        />
                    ) : (
                        <div className="text-muted-foreground italic">
                            Game type {gameEvent.type} not yet implemented.
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
