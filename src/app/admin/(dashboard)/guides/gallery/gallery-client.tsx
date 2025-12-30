"use client";

import { useState } from "react";
import Image from "next/image";
import { formatDistanceToNowStrict } from "date-fns";
import { Edit2, Trash2, MapPin, CheckCircle, XCircle, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { CtaIconButton } from "@/components/ui/cta-icon-button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { updateGuideImageMetadata, deleteGuideImage } from "@/app/actions/guide-images";
import type { GuideImage, ImageStatus } from "@/generated/prisma";

type GuideImageWithGuide = Omit<GuideImage, "latitude" | "longitude"> & {
    guide?: {
        title: string;
        slug: string;
    } | null;
    latitude: number | null;
    longitude: number | null;
};

interface GalleryProps {
    initialData: {
        images: GuideImageWithGuide[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export function GalleryClient({ initialData }: GalleryProps) {
    const router = useRouter();
    const [editingImage, setEditingImage] = useState<GuideImageWithGuide | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const handleEdit = (image: GuideImageWithGuide) => {
        setEditingImage(image);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this image?")) return;
        await deleteGuideImage(id);
    };

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingImage) return;

        setSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const alt = formData.get("alt") as string;
        const caption = formData.get("caption") as string;
        const status = formData.get("status") as ImageStatus;
        const lat = formData.get("lat") ? Number(formData.get("lat")) : null;
        const lng = formData.get("lng") ? Number(formData.get("lng")) : null;

        try {
            await updateGuideImageMetadata(editingImage.id, {
                alt,
                caption,
                status,
                latitude: lat,
                longitude: lng,
            });
            setEditingImage(null);
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Failed to update image");
        } finally {
            setSubmitting(false);
        }
    };

    const formatBytes = (bytes?: number | null) => {
        if (!bytes) return "N/A";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    return (
        <div className="space-y-6">
            {/* Gallery Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {initialData.images.map((img) => (
                    <div key={img.id} className="group relative bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        {/* Image Preview */}
                        <div className="aspect-square relative bg-muted">
                            <Image
                                src={img.url}
                                alt={img.alt || "Guide image"}
                                fill
                                className="object-cover"
                                unoptimized
                            />
                            {/* Badges/Overlays */}
                            <div className="absolute top-2 right-2 flex gap-2">
                                <StatusBadge
                                    value={img.status}
                                    variation={
                                        img.status === "APPROVED" ? "success" :
                                            img.status === "PENDING" ? "warning" :
                                                "danger"
                                    }
                                />
                            </div>
                        </div>

                        {/* Info */}
                        <div className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="font-medium truncate text-sm" title={img.guide?.title || "Unassigned"}>
                                        {img.guide?.title || "Unassigned"}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate" title={img.caption || img.alt || ""}>
                                        {img.caption || img.alt || "No caption"}
                                    </p>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleEdit(img)}>
                                            <Edit2 className="mr-2 h-4 w-4" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() => handleDelete(img.id)}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* Metadata */}
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                                <div>
                                    <span className="block font-semibold text-[10px] uppercase">Size</span>
                                    {formatBytes(img.size)}
                                </div>
                                <div>
                                    <span className="block font-semibold text-[10px] uppercase">Res</span>
                                    {img.width && img.height ? `${img.width}x${img.height}` : "N/A"}
                                </div>
                                <div>
                                    <span className="block font-semibold text-[10px] uppercase">Ext</span>
                                    {img.extension || "N/A"}
                                </div>
                                <div>
                                    <span className="block font-semibold text-[10px] uppercase">Geo</span>
                                    {img.latitude ? `${Number(img.latitude).toFixed(4)}, ...` : "N/A"}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {initialData.images.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-xl bg-muted/20">
                    <p className="text-muted-foreground">No images found.</p>
                </div>
            )}

            {/* Pagination Controls could go here */}

            {/* Edit Dialog */}
            <Dialog open={!!editingImage} onOpenChange={(open) => !open && setEditingImage(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Image Metadata</DialogTitle>
                        <DialogDescription>
                            Update image details and moderation status.
                        </DialogDescription>
                    </DialogHeader>

                    {editingImage && (
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <div className="relative aspect-video rounded-md overflow-hidden bg-muted border">
                                        <Image
                                            src={editingImage.url}
                                            alt={editingImage.alt || "Preview"}
                                            fill
                                            className="object-contain"
                                            unoptimized
                                        />
                                    </div>
                                </div>

                                <div className="col-span-2 space-y-2">
                                    <SelectField
                                        label="Status"
                                        name="status"
                                        defaultValue={editingImage.status}
                                        options={[
                                            { value: "PENDING", label: "Pending Review" },
                                            { value: "APPROVED", label: "Approved" },
                                            { value: "REJECTED", label: "Rejected" },
                                        ]}
                                    />
                                </div>

                                <div className="col-span-2">
                                    <InputField
                                        label="Alt Text"
                                        name="alt"
                                        defaultValue={editingImage.alt || ""}
                                        placeholder="Describe the image for accessibility"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <InputField
                                        label="Caption"
                                        name="caption"
                                        defaultValue={editingImage.caption || ""}
                                        placeholder="Image caption"
                                    />
                                </div>

                                <div>
                                    <InputField
                                        label="Latitude"
                                        name="lat"
                                        type="number"
                                        step="any"
                                        defaultValue={editingImage.latitude ? Number(editingImage.latitude) : ""}
                                        placeholder="0.000000"
                                    />
                                </div>
                                <div>
                                    <InputField
                                        label="Longitude"
                                        name="lng"
                                        type="number"
                                        step="any"
                                        defaultValue={editingImage.longitude ? Number(editingImage.longitude) : ""}
                                        placeholder="0.000000"
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setEditingImage(null)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? "Saving..." : "Save Changes"}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
