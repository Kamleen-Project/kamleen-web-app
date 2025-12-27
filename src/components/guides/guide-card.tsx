import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { cn } from "@/lib/utils";
import type { Guide } from "@/generated/prisma";
import { Badge } from "@/components/ui/badge";

type GuideCardProps = {
    guide: Guide & { author: { name: string | null; image: string | null } };
    className?: string;
};

export function GuideCard({ guide, className }: GuideCardProps) {
    return (
        <div className={cn("flex flex-col group h-full", className)}>
            <Link href={`/guides/${guide.slug}`} className="block relative aspect-[16/9] w-full overflow-hidden rounded-lg mb-4 bg-muted">
                <ImageWithFallback
                    src={guide.featuredImage || "/images/exp-placeholder.png"}
                    fallbackSrc="/images/exp-placeholder.png"
                    alt={guide.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
            </Link>
            <div className="flex flex-col flex-1 gap-2">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{formatDistanceToNowStrict(guide.publishedAt || guide.createdAt, { addSuffix: true })}</span>
                </div>
                <Link href={`/guides/${guide.slug}`} className="block">
                    <h3 className="text-xl font-bold leading-tight group-hover:text-primary transition-colors">{guide.title}</h3>
                </Link>
                <p className="text-muted-foreground line-clamp-2 text-sm">
                    {guide.excerpt || guide.content.replace(/<[^>]*>?/gm, '').substring(0, 150) + "..."}
                </p>
                <div className="mt-auto pt-4 flex flex-wrap gap-2">
                    {guide.tags.map((tag) => (
                        <Badge key={tag} variant="soft" className="text-xs uppercase tracking-wider">
                            {tag}
                        </Badge>
                    ))}
                </div>
            </div>
        </div>
    );
}
