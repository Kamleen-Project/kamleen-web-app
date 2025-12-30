"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CarouselImage {
    src: string;
    alt?: string;
}

interface GalleryCarouselProps {
    images: CarouselImage[];
    className?: string;
    onImageClick?: (src: string) => void;
}

export function GalleryCarousel({ images, className, onImageClick }: GalleryCarouselProps) {
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = React.useState(false);
    const [canScrollRight, setCanScrollRight] = React.useState(true);

    const checkScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
        }
    };

    React.useEffect(() => {
        checkScroll();
        window.addEventListener("resize", checkScroll);
        return () => window.removeEventListener("resize", checkScroll);
    }, [images]);

    const scroll = (direction: "left" | "right") => {
        if (scrollRef.current) {
            const container = scrollRef.current;
            const scrollAmount = container.clientWidth * 0.8;
            const targetScroll = direction === "left"
                ? container.scrollLeft - scrollAmount
                : container.scrollLeft + scrollAmount;

            container.scrollTo({
                left: targetScroll,
                behavior: "smooth"
            });
            // checkScroll will be called by scroll event
        }
    };

    if (!images || images.length === 0) return null;

    return (
        <div className={cn("relative group w-full my-6", className)}>
            <div
                ref={scrollRef}
                onScroll={checkScroll}
                className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-4 -mx-4"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                {images.map((img, index) => (
                    <div
                        key={`${img.src}-${index}`}
                        className={cn(
                            "relative flex-none w-full md:w-[32%] lg:w-[32%] aspect-[3/2] snap-center rounded-xl overflow-hidden shadow-sm border bg-muted/20",
                            onImageClick ? "cursor-zoom-in hover:brightness-95 active:scale-[0.99] transition-all" : ""
                        )}
                        onClick={() => onImageClick?.(img.src)}
                    >
                        <Image
                            src={img.src}
                            alt={img.alt || `Gallery image ${index + 1}`}
                            fill
                            className="object-cover !m-0"
                            sizes="(max-width: 768px) 85vw, (max-width: 1200px) 70vw, 60vw"
                        />
                    </div>
                ))}
            </div>

            {/* Navigation Buttons */}
            {canScrollLeft && (
                <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full shadow-lg bg-background/80 hover:bg-background backdrop-blur-sm"
                    onClick={() => scroll("left")}
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>
            )}

            {canScrollRight && (
                <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full shadow-lg bg-background/80 hover:bg-background backdrop-blur-sm"
                    onClick={() => scroll("right")}
                >
                    <ChevronRight className="h-5 w-5" />
                </Button>
            )}
        </div>
    );
}
