"use client";

import { useState } from "react";
import { UploadSinglePicture } from "@/components/ui/upload-single-picture";

export function ClientBannerUploader({
    name,
    initialValue,
    aspect
}: {
    name: string;
    initialValue?: string;
    aspect: "square" | "threeFour" | "fullWidth" | "twentyOneNine" | "twentyOneSix";
}) {
    const [value, setValue] = useState(initialValue);

    return (
        <>
            <input type="hidden" name={name} value={value || ""} />
            <UploadSinglePicture
                previewUrl={value}
                onChangeFile={async (file) => {
                    // We need to upload this file immediately to get a URL to put in the hidden input
                    // OR we handle the upload in the parent form action if we were sending FormData with file.
                    // However, the `saveBanner` server action expects a string URL? 
                    // "UploadSinglePicture" calls "onChangeFile" with a File object.
                    // The "UploadSinglePicture" component itself doesn't handle the upload to server, it just exposes the file.
                    // Let's check `UploadSinglePicture` implementation again.
                    // It calls `processImageFile` then `onChangeFile(toSend)`.
                    // It does NOT upload.

                    // So I need to implement the upload logic here to get the URL.
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("folder", "hero"); // Use 'hero' folder

                    try {
                        const res = await fetch("/api/uploads/image", {
                            method: "POST",
                            body: formData,
                        });
                        if (!res.ok) throw new Error("Upload failed");
                        const data = await res.json();
                        setValue(data.url);
                    } catch (e) {
                        console.error(e);
                        alert("Failed to upload image");
                    }
                }}
                onRemove={() => setValue("")}
                aspect={aspect}
                objectFit="cover"
            />
        </>
    );
}
