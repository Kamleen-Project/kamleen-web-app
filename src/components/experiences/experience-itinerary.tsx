"use client";

import { ImageWithFallback } from "@/components/ui/image-with-fallback";

import { ExperienceItineraryModal, type ExperienceItineraryStep } from "@/components/experiences/experience-itinerary-modal";

export type ExperienceItineraryProps = {
	title: string;
	steps: ExperienceItineraryStep[];
};

export function ExperienceItinerary({ title, steps }: ExperienceItineraryProps) {
	if (!steps.length) {
		return null;
	}

	return (
		<ExperienceItineraryModal
			title={title}
			steps={steps}
			trigger={({ open }) => (
				<div className="space-y-8">
					{steps.map((step, index) => (
						<div key={step.id} className="flex flex-col sm:flex-row sm:items-start">
							<button
								type="button"
								onClick={() => open(index)}
								className="group relative h-36 w-full overflow-hidden rounded-xl border border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-36 sm:w-36"
								aria-label={`Open ${step.title} photo`}
							>
								<ImageWithFallback
									src={step.image || "/images/exp-placeholder.png"}
									alt={`${step.title} visuals`}
									fill
									sizes="(min-width: 1024px) 18rem, 90vw"
									className="object-cover transition duration-300 group-hover:scale-105"
								/>
							</button>
							<div className="flex flex-1 flex-col justify-center gap-3 p-4">
								<h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
								{step.subtitle ? <p className="text-sm text-muted-foreground">{step.subtitle}</p> : null}
							</div>
						</div>
					))}
				</div>
			)}
		/>
	);
}
