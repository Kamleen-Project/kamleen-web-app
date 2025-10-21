"use client";

import { Container } from "@/components/layout/container";
import { ExperienceSearchForm } from "@/components/experiences/experience-search-form";
import { cn } from "@/lib/utils";

type StickySearchSectionProps = {
	className?: string;
	initialValues?: {
		q?: string;
		start?: string;
		end?: string;
		guests?: string;
	};
};

export function StickySearchSection({ className, initialValues }: StickySearchSectionProps) {
	return (
		<div
			className={cn(
				"sticky top-16 z-30 w-full border-b border-border/60 bg-white/95 text-black backdrop-blur supports-[backdrop-filter]:bg-white/80",
				className
			)}
		>
			<Container className="mx-auto">
				<ExperienceSearchForm initialValues={initialValues} />
			</Container>
		</div>
	);
}

export default StickySearchSection;
