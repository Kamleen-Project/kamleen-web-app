"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Trash, FileEdit, Eye, Archive } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteGuide, trashGuide } from "@/app/actions/guides";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface GuidesActionsProps {
    guideId: string;
    slug: string;
    isTrashed?: boolean;
}

export function GuidesActions({ guideId, slug, isTrashed }: GuidesActionsProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [open, setOpen] = useState(false);

    const handleTrash = () => {
        startTransition(async () => {
            try {
                await trashGuide(guideId);
                toast.success("Guide moved to trash");
                router.refresh();
            } catch (error) {
                toast.error("Failed to trash guide");
            }
        });
    };

    const handleDelete = () => {
        if (!confirm("Are you sure you want to permanently delete this guide?")) return;
        startTransition(async () => {
            try {
                await deleteGuide(guideId);
                toast.success("Guide deleted");
                router.refresh();
            } catch (error) {
                toast.error("Failed to delete guide");
            }
        });
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-1 flex flex-col gap-1">
                <button
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted text-left"
                    onClick={() => { setOpen(false); router.push(`/admin/guides/${guideId}`); }}
                >
                    <FileEdit className="mr-2 h-4 w-4" />
                    Edit
                </button>
                <button
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted text-left"
                    onClick={() => { setOpen(false); window.open(`/guides/${slug}`, "_blank"); }}
                >
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                </button>

                <div className="h-px bg-border my-1" />

                {isTrashed ? (
                    <button onClick={() => { setOpen(false); handleDelete(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-destructive/10 text-red-600">
                        <Trash className="mr-2 h-4 w-4" />
                        Delete Permanently
                    </button>
                ) : (
                    <button onClick={() => { setOpen(false); handleTrash(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted text-orange-600">
                        <Archive className="mr-2 h-4 w-4" />
                        Move to Trash
                    </button>
                )}

            </PopoverContent>
        </Popover>
    );
}
