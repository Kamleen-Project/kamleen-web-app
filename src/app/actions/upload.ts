"use server";

import { saveUploadedFile } from "@/lib/uploads";
import { getServerAuthSession } from "@/lib/auth";

export async function uploadFileAction(formData: FormData) {
    const session = await getServerAuthSession();
    const user = session?.user;
    if (!user || user.activeRole !== "ADMIN") {
        // Allow upload for approved organizers too perhaps? But sticking to admin for now as requested.
        throw new Error("Unauthorized");
    }

    const file = formData.get("file") as File;
    if (!file) throw new Error("No file provided");

    const result = await saveUploadedFile({
        file,
        directory: "guides"
    });

    return { url: result.publicPath };
}
