import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExperienceRatingProps {
    averageRating: number;
    reviewCount: number;
    variant?: "default" | "sticky";
    className?: string;
}

export function ExperienceRating({
    averageRating,
    reviewCount,
    variant = "default",
    className,
}: ExperienceRatingProps) {
    const hasReviews = reviewCount > 0;
    const isSticky = variant === "sticky";

    if (!hasReviews) {
        return null;
    }

    return (
        <div className={cn("flex items-center gap-2", isSticky ? "text-xs text-white/80" : "text-sm text-muted-foreground", className)}>
            <span className="inline-flex items-center gap-1">
                <Star
                    className={cn(
                        "size-4",
                        isSticky ? "text-amber-400" : "text-amber-500"
                    )}
                    aria-hidden="true"
                />
                <span className={cn("font-medium", isSticky ? "text-white" : "text-foreground")}>
                    {averageRating.toFixed(2)}
                </span>
            </span>
            <span className={cn(isSticky ? "" : "text-xs text-muted-foreground")}>
                {isSticky ? "" : "Based on "}
                {reviewCount} review{reviewCount === 1 ? "" : "s"}
            </span>
        </div>
    );
}
