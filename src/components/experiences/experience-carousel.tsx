"use client";

import { useEffect, useRef, useState } from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { ExperienceCard, type Experience } from "@/components/cards/experience-card";
import CtaIconButton from "@/components/ui/cta-icon-button";
import { cn } from "@/lib/utils";



type ExperienceCarouselProps = {
	eyebrow?: string;
	title: string;
	description?: string;
	experiences: Experience[];
	className?: string;
	hideLocation?: boolean;
};

export function ExperienceCarousel({ eyebrow, title, description, experiences, className, hideLocation }: ExperienceCarouselProps) {
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [canScrollPrev, setCanScrollPrev] = useState(false);
	const [canScrollNext, setCanScrollNext] = useState(true);

	const checkScroll = () => {
		if (scrollContainerRef.current) {
			const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
			setCanScrollPrev(scrollLeft > 0);
			setCanScrollNext(scrollLeft < scrollWidth - clientWidth - 1); // -1 for rounding errors
		}
	};

	useEffect(() => {
		checkScroll();
		window.addEventListener("resize", checkScroll);
		return () => window.removeEventListener("resize", checkScroll);
	}, [experiences]);

	const scroll = (direction: "left" | "right") => {
		if (scrollContainerRef.current) {
			const container = scrollContainerRef.current;
			const scrollAmount = container.clientWidth; // Scroll by one full view width
			const newScrollLeft = direction === "left" ? container.scrollLeft - scrollAmount : container.scrollLeft + scrollAmount;

			container.scrollTo({
				left: newScrollLeft,
				behavior: "smooth",
			});
		}
	};

	if (!experiences.length) {
		return null;
	}

	return (
		<div className={cn("space-y-6", className)}>
			<div className="flex flex-row items-end justify-between gap-4">
				<div className="max-w-3xl space-y-2 flex-1">
					{eyebrow ? <p className="text-sm font-medium uppercase tracking-wider text-primary">{eyebrow}</p> : null}
					<h3 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h3>
					{description ? <p className="text-sm text-muted-foreground sm:text-base">{description}</p> : null}
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<CtaIconButton
						color="white"
						size="md"
						onClick={() => scroll("left")}
						disabled={!canScrollPrev}
						ariaLabel="Show previous experiences"
					>
						<ChevronLeft className="size-4" />
					</CtaIconButton>
					<CtaIconButton
						color="white"
						size="md"
						onClick={() => scroll("right")}
						disabled={!canScrollNext}
						ariaLabel="Show next experiences"
					>
						<ChevronRight className="size-4" />
					</CtaIconButton>
				</div>
			</div>

			<div
				ref={scrollContainerRef}
				onScroll={checkScroll}
				className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 -mb-4 scrollbar-hide"
				style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
			>
				{experiences.map((experience) => (
					<div
						key={experience.id}
						className="flex-none w-full snap-start sm:w-[calc(50%-12px)] md:w-[calc(25%-18px)]"
					>
						<ExperienceCard experience={experience} hideLocation={hideLocation} />
					</div>
				))}
			</div>
		</div>
	);
}
