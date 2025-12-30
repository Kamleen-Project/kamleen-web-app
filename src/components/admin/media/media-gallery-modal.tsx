"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input-field";
import { Loader2, Search, Upload, Check, Trash2 } from "lucide-react";
import { getGuideImagesAdmin, registerGuideImage, deleteGuideImage } from "@/app/actions/guide-images";
import { uploadFileAction } from "@/app/actions/upload";
import type { GuideImage } from "@/generated/prisma";
import { useNotifications } from "@/components/providers/notification-provider";

interface MediaGalleryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (images: GuideImage[]) => void;
    multiSelect?: boolean;
}

export function MediaGalleryModal({ open, onOpenChange, onSelect, multiSelect = true }: MediaGalleryModalProps) {
    const { notify } = useNotifications();
    const [tab, setTab] = useState<"library" | "upload">("library");
    const [images, setImages] = useState<GuideImage[]>([]);
    const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [uploading, setUploading] = useState(false);

    // Fetch images when opening library
    useEffect(() => {
        if (open && tab === "library") {
            fetchImages(1);
        }
    }, [open, tab]);

    const fetchImages = async (p: number) => {
        setLoading(true);
        try {
            const res = await getGuideImagesAdmin({ page: p, limit: 12 });
            setImages(res.images as any); // Cast because of minor type diff with Optional Guide
            setTotalPages(res.totalPages);
            setPage(p);
        } catch (error) {
            console.error(error);
            notify({ title: "Error", message: "Failed to load images", intent: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (img: GuideImage) => {
        const newSelected = new Set(selectedImages);
        if (multiSelect) {
            if (newSelected.has(img.id)) {
                newSelected.delete(img.id);
            } else {
                newSelected.add(img.id);
            }
        } else {
            // Single select toggle
            if (newSelected.has(img.id)) {
                newSelected.clear();
            } else {
                newSelected.clear();
                newSelected.add(img.id);
            }
        }
        setSelectedImages(newSelected);
    };

    const handleConfirm = () => {
        const selected = images.filter(img => selectedImages.has(img.id));
        onSelect(selected);
        onOpenChange(false);
        setSelectedImages(new Set());
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            const promises = Array.from(files).map(async (file) => {
                const formData = new FormData();
                formData.append("file", file);

                // Get image dimensions locally if possible
                const dimensions = await new Promise<{ width: number, height: number }>((resolve) => {
                    const img = document.createElement("img");
                    img.onload = () => resolve({ width: img.width, height: img.height });
                    img.onerror = () => resolve({ width: 0, height: 0 });
                    img.src = URL.createObjectURL(file);
                });

                // Upload
                const { url } = await uploadFileAction(formData);

                // Register
                const registered = await registerGuideImage({
                    url,
                    width: dimensions.width,
                    height: dimensions.height,
                    size: file.size,
                    mimeType: file.type,
                    extension: file.name.split('.').pop(),
                });
                return registered;
            });

            await Promise.all(promises);
            notify({ title: "Success", message: "Images uploaded successfully", intent: "success" });

            // Switch to library and refresh
            setTab("library");
            fetchImages(1);
        } catch (error) {
            console.error(error);
            notify({ title: "Error", message: "Failed to upload images", intent: "error" });
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("Delete this image permanently?")) return;
        try {
            await deleteGuideImage(id);
            fetchImages(page);
        } catch (error) {
            notify({ title: "Error", message: "Failed to delete image", intent: "error" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle>Media Gallery</DialogTitle>
                </DialogHeader>

                <div className="flex border-b bg-muted/40">
                    <button
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${tab === "library" ? "border-primary text-primary bg-background" : "border-transparent text-muted-foreground hover:bg-muted"}`}
                        onClick={() => setTab("library")}
                    >
                        Library
                    </button>
                    <button
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${tab === "upload" ? "border-primary text-primary bg-background" : "border-transparent text-muted-foreground hover:bg-muted"}`}
                        onClick={() => setTab("upload")}
                    >
                        Upload
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 min-h-[400px]">
                    {tab === "library" ? (
                        <div className="space-y-4">
                            {/* Toolbar? Search? */}

                            {loading ? (
                                <div className="flex justify-center py-20">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : images.length === 0 ? (
                                <div className="text-center py-20 text-muted-foreground">
                                    No images found. Switch to Upload tab to add some.
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {images.map((img) => (
                                        <div
                                            key={img.id}
                                            onClick={() => handleSelect(img as any)}
                                            className={`group relative aspect-square border rounded-md cursor-pointer overflow-hidden transition-all ${selectedImages.has(img.id) ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"
                                                }`}
                                        >
                                            <Image
                                                src={img.url}
                                                alt={img.alt || "Gallery image"}
                                                fill
                                                className="object-cover"
                                                unoptimized
                                            />
                                            {selectedImages.has(img.id) && (
                                                <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5">
                                                    <Check className="h-4 w-4" />
                                                </div>
                                            )}
                                            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => handleDelete(e, img.id)}
                                                    className="bg-destructive/90 text-destructive-foreground p-1.5 rounded-md hover:bg-destructive"
                                                    title="Delete image"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex justify-center gap-2 pt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page <= 1}
                                        onClick={() => fetchImages(page - 1)}
                                    >
                                        Previous
                                    </Button>
                                    <span className="text-sm flex items-center px-2">
                                        Page {page} of {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page >= totalPages}
                                        onClick={() => fetchImages(page + 1)}
                                    >
                                        Next
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl bg-muted/10">
                            {uploading ? (
                                <div className="text-center space-y-4">
                                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                                    <p className="text-muted-foreground">Uploading images...</p>
                                </div>
                            ) : (
                                <div className="text-center space-y-4">
                                    <div className="bg-muted p-4 rounded-full w-fit mx-auto">
                                        <Upload className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">Upload Images</h3>
                                        <p className="text-muted-foreground text-sm">Drag & drop or click to select</p>
                                    </div>
                                    <div className="relative">
                                        <Button>Select Files</Button>
                                        <input
                                            type="file"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            multiple
                                            accept="image/*"
                                            onChange={handleUpload}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="px-6 py-4 border-t bg-muted/20">
                    <div className="flex justify-between w-full items-center">
                        <div className="text-sm text-muted-foreground">
                            {selectedImages.size} selected
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleConfirm} disabled={selectedImages.size === 0}>
                                Insert Selected
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
