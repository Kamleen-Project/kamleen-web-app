
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function PreviewBar({
    status,
    editUrl
}: {
    status: string;
    editUrl: string;
}) {
    if (status === "PUBLISHED") return null;

    return (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-amber-500/50 bg-amber-500/10 px-4 py-2 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-3">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    Preview Mode ({status})
                </span>
                <div className="h-4 w-px bg-amber-500/20" />
                <Button size="sm" variant="ghost" className="h-auto p-0 text-amber-700 hover:bg-transparent hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100" asChild>
                    <Link href={editUrl}>
                        Return to Editor
                    </Link>
                </Button>
            </div>
        </div>
    );
}
