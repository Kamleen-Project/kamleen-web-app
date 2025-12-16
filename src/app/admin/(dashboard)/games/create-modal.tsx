"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { CtaButton } from "@/components/ui/cta-button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { InputField } from "@/components/ui/input-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { SelectField } from "@/components/ui/select-field";
import { DateField } from "@/components/ui/date-field";
import { CtaIconButton } from "@/components/ui/cta-icon-button";
import { createGameEvent } from "@/app/actions/games";
import { GameType } from "@/generated/prisma";
import { useRouter } from "next/navigation";
import type { CalendarDateRange } from "@/components/ui/calendar";

// Safe UUID generator with fallback
function generateId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Types
type CouponOption = {
    id: string;
    code: string;
    description?: string;
};

interface AdminCreateGameModalProps {
    coupons: CouponOption[];
}

interface Prize {
    id: string;
    couponId: string;
    odds: string;
    label: string;
    color: string;
}

export function AdminCreateGameModal({ coupons }: AdminCreateGameModalProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [dateRange, setDateRange] = useState<CalendarDateRange | undefined>(undefined);
    const [prizes, setPrizes] = useState<Prize[]>([
        {
            id: generateId(),
            couponId: "",
            odds: "0.1",
            label: "",
            color: "#FF0000"
        }
    ]);

    function addPrize() {
        setPrizes([
            ...prizes,
            {
                id: generateId(),
                couponId: "",
                odds: "0.1",
                label: "Win!",
                color: "#" + Math.floor(Math.random() * 16777215).toString(16),
            },
        ]);
    }

    function removePrize(id: string) {
        setPrizes(prizes.filter((p) => p.id !== id));
    }

    function updatePrize(id: string, field: keyof Prize, value: string) {
        setPrizes(prizes.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
    }

    async function onSubmit(formData: FormData) {
        setIsLoading(true);

        try {
            // Validate date range
            if (!dateRange?.from || !dateRange?.to) {
                alert("Please select a valid date range");
                setIsLoading(false);
                return;
            }

            // Build prizes data
            const prizesData = prizes.map((p) => ({
                couponId: p.couponId,
                odds: parseFloat(p.odds),
                label: p.label || undefined,
                color: p.color || undefined,
            }));

            // Validate prizes
            if (prizesData.some((p) => !p.couponId)) {
                alert("Please select a coupon for all prizes");
                setIsLoading(false);
                return;
            }

            const result = await createGameEvent({
                type: formData.get("type") as GameType,
                title: formData.get("title") as string,
                description: formData.get("description") as string || undefined,
                startDate: dateRange.from,
                endDate: dateRange.to,
                isActive: true,
                prizes: prizesData,
            });

            if (result.success) {
                setOpen(false);
                // Reset form
                setPrizes([{
                    id: generateId(),
                    couponId: "",
                    odds: "0.1",
                    label: "",
                    color: "#FF0000"
                }]);
                setDateRange(undefined);
                router.refresh();
            } else {
                alert(result.error || "Failed to create game event");
            }
        } catch (error) {
            alert("Failed to create game event");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <CtaButton startIcon={<Plus className="size-4 mr-2" />}>
                    Create Game Event
                </CtaButton>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Game Event</DialogTitle>
                    <DialogDescription>
                        Configure a new interactive game event and assign prizes.
                    </DialogDescription>
                </DialogHeader>

                <form action={onSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <SelectField
                                name="type"
                                label="Game Type"
                                required
                                defaultValue={GameType.ROULETTE}
                            >
                                <option value={GameType.ROULETTE}>Roulette</option>
                            </SelectField>

                            <InputField
                                name="title"
                                label="Title"
                                placeholder="e.g. Summer Spin & Win"
                                required
                            />

                            <TextareaField
                                name="description"
                                label="Description"
                                placeholder="Short description of the event..."
                                className="resize-none"
                                rows={3}
                            />

                            <DateField
                                label="Event Duration"
                                range
                                valueRange={dateRange}
                                onChangeRange={setDateRange}
                                nameStart="startDate"
                                nameEnd="endDate"
                                required
                                minDate={new Date()}
                                placeholder="Pick a date range"
                                allowTextInput={false}
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Prizes & Odds</label>
                                <CtaButton
                                    type="button"
                                    color="whiteBorder"
                                    size="sm"
                                    onClick={addPrize}
                                    startIcon={<Plus className="size-4" />}
                                >
                                    Add Prize
                                </CtaButton>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Total probability should ideally sum close to 1.0 (or less if there's a "lose" chance).
                            </p>

                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                {prizes.map((prize, index) => (
                                    <div
                                        key={prize.id}
                                        className="p-3 border rounded-lg bg-card space-y-3"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-sm font-medium text-muted-foreground">Prize #{index + 1}</span>
                                            {prizes.length > 1 && (
                                                <CtaIconButton
                                                    type="button"
                                                    color="white"
                                                    size="sm"
                                                    onClick={() => removePrize(prize.id)}
                                                    ariaLabel="Remove prize"
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="size-4" />
                                                </CtaIconButton>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <SelectField
                                                label="Coupon"
                                                value={prize.couponId}
                                                onChange={(e) => updatePrize(prize.id, "couponId", e.target.value)}
                                                containerClassName="col-span-2"
                                                required
                                            >
                                                <option value="">Select Coupon</option>
                                                {coupons.map((coupon) => (
                                                    <option key={coupon.id} value={coupon.id}>
                                                        {coupon.code} {coupon.description ? ` - ${coupon.description}` : ""}
                                                    </option>
                                                ))}
                                            </SelectField>

                                            <InputField
                                                label="Odds (0-1)"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="1"
                                                value={prize.odds}
                                                onChange={(e) => updatePrize(prize.id, "odds", e.target.value)}
                                                required
                                            />

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Color</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="color"
                                                        className="p-1 h-11 w-12 shrink-0 rounded-lg border border-input bg-background cursor-pointer"
                                                        value={prize.color}
                                                        onChange={(e) => updatePrize(prize.id, "color", e.target.value)}
                                                    />
                                                    <InputField
                                                        placeholder="#RRGGBB"
                                                        value={prize.color}
                                                        onChange={(e) => updatePrize(prize.id, "color", e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <InputField
                                                label="Display Label"
                                                placeholder="e.g. 50% OFF"
                                                containerClassName="col-span-2"
                                                value={prize.label}
                                                onChange={(e) => updatePrize(prize.id, "label", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <CtaButton type="submit" isLoading={isLoading}>
                            Create Event
                        </CtaButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
