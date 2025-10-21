"use client";

import { useEffect, useMemo, useState } from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { ExperienceCard, type Experience } from "@/components/cards/experience-card";
import CtaIconButton from "@/components/ui/cta-icon-button";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 4;

type ExperienceCarouselProps = {
	eyebrow?: string;
	title: string;
	description?: string;
	experiences: Experience[];
	className?: string;
};

export function ExperienceCarousel({ eyebrow, title, description, experiences, className }: ExperienceCarouselProps) {
	const pages = useMemo(() => {
		const chunks: Experience[][] = [];
		for (let index = 0; index < experiences.length; index += PAGE_SIZE) {
			chunks.push(experiences.slice(index, index + PAGE_SIZE));
		}
		return chunks;
	}, [experiences]);

	const [page, setPage] = useState(0);
	const totalPages = pages.length;
	const current = pages[page] ?? [];

	useEffect(() => {
		setPage(0);
	}, [experiences]);

	useEffect(() => {
		if (page > totalPages - 1) {
			setPage(Math.max(totalPages - 1, 0));
		}
	}, [page, totalPages]);

	if (!experiences.length) {
		return null;
	}

	const goToPrev = () => setPage((prev) => Math.max(prev - 1, 0));
	const goToNext = () => setPage((prev) => Math.min(prev + 1, totalPages - 1));

	return (
		<div className={cn("space-y-6", className)}>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div className="max-w-3xl space-y-2">
					{eyebrow ? <p className="text-sm font-medium uppercase tracking-wider text-primary">{eyebrow}</p> : null}
					<h3 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h3>
					{description ? <p className="text-sm text-muted-foreground sm:text-base">{description}</p> : null}
				</div>
				{totalPages > 1 ? (
					<div className="flex shrink-0 items-center gap-2">
						<CtaIconButton color="white" size="md" onClick={goToPrev} disabled={page === 0} ariaLabel="Show previous experiences">
							<ChevronLeft className="size-4" />
						</CtaIconButton>
						<CtaIconButton color="white" size="md" onClick={goToNext} disabled={page === totalPages - 1} ariaLabel="Show next experiences">
							<ChevronRight className="size-4" />
						</CtaIconButton>
					</div>
				) : null}
			</div>

			<div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
				{current.map((experience) => (
					<ExperienceCard key={experience.id} experience={experience} />
				))}
			</div>

			{totalPages > 1 ? (
				<p className="text-right text-xs text-muted-foreground">
					Page {page + 1} of {totalPages}
				</p>
			) : null}
		</div>
	);
}
