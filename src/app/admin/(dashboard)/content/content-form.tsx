"use client";

import { useTransition, useState } from "react";
import { CtaButton } from "@/components/ui/cta-button";
import { ClientBannerUploader } from "./client-uploader";
import { saveBanner } from "./actions";
import { useNotifications } from "@/components/providers/notification-provider";

interface ContentFormProps {
    initialBanner: {
        mobileImage: string;
        desktopImage: string;
        isActive: boolean;
        actionType: "LINK" | "MODAL";
        linkUrl: string | null;
        modalTitle: string | null;
        modalContent: string | null;
        requiresAuth: boolean;
    } | null;
}

export function ContentForm({ initialBanner }: ContentFormProps) {
    const { notify } = useNotifications();
    const [isPending, startTransition] = useTransition();
    const [actionType, setActionType] = useState<"LINK" | "MODAL">(initialBanner?.actionType ?? "LINK");

    const handleSubmit = (formData: FormData) => {
        startTransition(async () => {
            try {
                await saveBanner(formData);
                notify({
                    title: "Success",
                    message: "Banner updated successfully",
                    intent: "success",
                });
            } catch {
                notify({
                    title: "Error",
                    message: "Failed to update banner",
                    intent: "error",
                });
            }
        });
    };

    return (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-medium">Home Page Banner</h2>

            <form action={handleSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                        <label className="text-sm font-medium">Mobile Banner (3:1)</label>
                        <div className="w-full max-w-[400px]">
                            <BannerUploader
                                name="mobileImage"
                                initialValue={initialBanner?.mobileImage}
                                aspect="twentyOneNine"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium">Desktop Banner (6:1)</label>
                        <div className="w-full">
                            <BannerUploader
                                name="desktopImage"
                                initialValue={initialBanner?.desktopImage}
                                aspect="twentyOneSix"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 border-t pt-6">
                    <div className="space-y-3">
                        <label htmlFor="actionType" className="text-sm font-medium">Action Type</label>
                        <select
                            id="actionType"
                            name="actionType"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={actionType}
                            onChange={(e) => setActionType(e.target.value as "LINK" | "MODAL")}
                        >
                            <option value="LINK">Open Link</option>
                            <option value="MODAL">Open Modal</option>
                        </select>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center space-x-2 h-10 mt-6">
                            <input
                                type="checkbox"
                                id="requiresAuth"
                                name="requiresAuth"
                                defaultChecked={initialBanner?.requiresAuth ?? false}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <label htmlFor="requiresAuth" className="text-sm font-medium">Requires Authentication</label>
                        </div>
                    </div>
                </div>

                {actionType === "LINK" ? (
                    <div className="space-y-3">
                        <label htmlFor="linkUrl" className="text-sm font-medium">Link URL</label>
                        <input
                            type="text"
                            id="linkUrl"
                            name="linkUrl"
                            defaultValue={initialBanner?.linkUrl ?? ""}
                            placeholder="e.g. /experiences/summer-special"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-3">
                            <label htmlFor="modalTitle" className="text-sm font-medium">Modal Title</label>
                            <input
                                type="text"
                                id="modalTitle"
                                name="modalTitle"
                                defaultValue={initialBanner?.modalTitle ?? ""}
                                placeholder="Modal Title"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                        <div className="space-y-3">
                            <label htmlFor="modalContent" className="text-sm font-medium">
                                Modal Content <span className="text-xs text-muted-foreground font-normal">(HTML supported)</span>
                            </label>
                            <textarea
                                id="modalContent"
                                name="modalContent"
                                defaultValue={initialBanner?.modalContent ?? ""}
                                placeholder="<p>Content description with <strong>HTML</strong>...</p>"
                                rows={8}
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                            />
                        </div>
                    </div>
                )}

                <div className="flex items-center space-x-2 pt-4 border-t">
                    <input
                        type="checkbox"
                        id="isActive"
                        name="isActive"
                        defaultChecked={initialBanner?.isActive ?? true}
                        className="h-4 w-4 rounded border-gray-300"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium">Show banner on home page</label>
                </div>

                <div className="flex justify-end">
                    <CtaButton type="submit" disabled={isPending}>
                        {isPending ? "Saving..." : "Save Changes"}
                    </CtaButton>
                </div>
            </form>
        </div>
    );
}

function BannerUploader({ name, initialValue, aspect }: { name: string, initialValue?: string, aspect: "square" | "threeFour" | "fullWidth" | "twentyOneNine" | "twentyOneSix" }) {
    return <ClientBannerUploader name={name} initialValue={initialValue} aspect={aspect} />
}
