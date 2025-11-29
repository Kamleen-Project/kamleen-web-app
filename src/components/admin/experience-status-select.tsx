"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { updateExperienceStatus, updateExperienceReservationStatus } from "@/app/actions/experiences";
import { StatusBadge } from "@/components/ui/status-badge";

type StatusType = "PUBLISHING" | "RESERVATION";

interface ExperienceStatusSelectProps {
    experienceId: string;
    currentStatus: string;
    type: StatusType;
}

const PUBLISHING_STATUSES = [
    { value: "DRAFT", label: "Draft", variation: "muted" },
    { value: "PUBLISHED", label: "Published", variation: "success" },
    { value: "UNPUBLISHED", label: "Unpublished", variation: "warning" },
    { value: "UNLISTED", label: "Unlisted", variation: "soft" },
    { value: "ARCHIVED", label: "Archived", variation: "danger" },
] as const;

const RESERVATION_STATUSES = [
    { value: "OPEN", label: "Open", variation: "success" },
    { value: "COMING_SOON", label: "Coming Soon", variation: "warning" },
    { value: "CLOSED", label: "Closed", variation: "danger" },
] as const;

export function ExperienceStatusSelect({ experienceId, currentStatus, type }: ExperienceStatusSelectProps) {
    const [open, setOpen] = useState(false);
    const [pending, startTransition] = useTransition();
    const [optimisticStatus, setOptimisticStatus] = useState(currentStatus);

    const statuses = type === "PUBLISHING" ? PUBLISHING_STATUSES : RESERVATION_STATUSES;
    const selectedStatus = statuses.find((s) => s.value === optimisticStatus) || statuses[0];

    const handleSelect = (value: string) => {
        setOptimisticStatus(value);
        setOpen(false);
        startTransition(async () => {
            try {
                if (type === "PUBLISHING") {
                    // @ts-expect-error -- TODO: Fix type mismatch in updateExperienceStatus
                    await updateExperienceStatus(experienceId, value);
                } else {
                    // @ts-expect-error -- TODO: Fix type mismatch in updateExperienceReservationStatus
                    await updateExperienceReservationStatus(experienceId, value);
                }
            } catch (error) {
                // Revert on error
                setOptimisticStatus(currentStatus);
                console.error("Failed to update status", error);
            }
        });
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    role="combobox"
                    aria-expanded={open}
                    className="h-auto p-0 hover:bg-transparent focus-visible:ring-0"
                    disabled={pending}
                >
                    <div className="flex items-center gap-1">
                        <StatusBadge
                            value={selectedStatus.label}
                            variation={selectedStatus.variation}
                            className={cn("cursor-pointer transition-opacity hover:opacity-80", pending && "opacity-50")}
                        />
                        {pending && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[180px] p-0" align="start">
                <Command>
                    <CommandList>
                        <CommandEmpty>No status found.</CommandEmpty>
                        <CommandGroup>
                            {statuses.map((status) => (
                                <CommandItem
                                    key={status.value}
                                    value={status.value}
                                    onSelect={() => handleSelect(status.value)}
                                    className="flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={cn("h-2 w-2 rounded-full", getStatusColor(status.variation))} />
                                        <span>{status.label}</span>
                                    </div>
                                    {optimisticStatus === status.value && <Check className="size-4 opacity-100" />}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

function getStatusColor(variation: string) {
    switch (variation) {
        case "success":
            return "bg-emerald-500";
        case "warning":
            return "bg-amber-500";
        case "danger":
            return "bg-red-500";
        case "muted":
            return "bg-slate-400";
        case "soft":
            return "bg-blue-400";
        default:
            return "bg-slate-400";
    }
}
