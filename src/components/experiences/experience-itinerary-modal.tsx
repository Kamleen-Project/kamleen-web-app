"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { ChevronDown, ChevronUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ExperienceItineraryStep = {
	id: string;
	title: string;
	subtitle?: string | null;
	image?: string | null;
};

type TriggerRender = (helpers: { open: (index: number) => void }) => ReactNode;

type ExperienceItineraryModalProps = {
	steps: ExperienceItineraryStep[];
	title: string;
	trigger: TriggerRender;
};

export function ExperienceItineraryModal({ steps, title, trigger }: ExperienceItineraryModalProps) {
	const totalSteps = steps.length;
	const [mounted, setMounted] = useState(false);
	const [open, setOpen] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(0);

	const openModal = useCallback(
		(index: number) => {
			if (!totalSteps) {
				return;
			}

			const safeIndex = Math.max(0, Math.min(index, totalSteps - 1));
			setSelectedIndex(safeIndex);
			setOpen(true);
		},
		[totalSteps]
	);

	const closeModal = useCallback(() => {
		setOpen(false);
	}, []);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!open || !totalSteps) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				closeModal();
				return;
			}

			if (event.key === "ArrowRight" || event.key === "ArrowDown") {
				setSelectedIndex((current) => (current + 1) % totalSteps);
			}

			if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
				setSelectedIndex((current) => (current - 1 + totalSteps) % totalSteps);
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		document.body.classList.add("overflow-hidden");

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.body.classList.remove("overflow-hidden");
		};
	}, [closeModal, open, totalSteps]);

	useEffect(() => {
		if (selectedIndex >= totalSteps && totalSteps > 0) {
			setSelectedIndex(totalSteps - 1);
		}
	}, [selectedIndex, totalSteps]);

	const selectedStep = steps[selectedIndex] ?? null;

	const modalContent = useMemo(() => {
		if (!mounted || !open || !selectedStep) {
			return null;
		}

		return createPortal(
			<div
				className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 px-4 py-6"
				role="dialog"
				aria-modal="true"
				aria-label={`${title} itinerary step details`}
				onClick={closeModal}
			>
				<div onClick={(event) => event.stopPropagation()} className="relative w-full max-w-2xl">
					<button
						type="button"
						onClick={closeModal}
						className="absolute -right-6 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-background/90 text-muted-foreground shadow-sm transition hover:text-foreground md:-right-12"
						aria-label="Close itinerary modal"
					>
						<X className="size-5" />
					</button>

					<div className="pointer-events-auto hidden flex-col items-center gap-3 md:absolute md:-left-32 md:top-1/2 md:flex md:-translate-y-1/2">
						<button
							type="button"
							onClick={() => setSelectedIndex((current) => (current - 1 + totalSteps) % totalSteps)}
							className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background text-muted-foreground transition hover:text-foreground"
							aria-label="Show previous itinerary step"
						>
							<ChevronUp className="size-4" />
						</button>
						<div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
							{steps.map((step, index) => {
								const isActive = index === selectedIndex;
								return (
									<button
										key={step.id}
										type="button"
										onClick={() => setSelectedIndex(index)}
										className={cn(
											"relative flex items-center overflow-hidden rounded-2xl border text-left transition p-1",
											isActive
												? "border-primary/80 bg-primary/100 text-foreground"
												: "border-border/60 bg-background/100 text-muted-foreground hover:border-border/80 hover:text-foreground"
										)}
										aria-label={`View ${step.title}`}
									>
										<div className="relative h-24 w-24 overflow-hidden rounded-xl">
											<ImageWithFallback src={step.image || "/images/image-placeholder.png"} alt={step.title} fill sizes="120px" className="object-cover" />
										</div>
									</button>
								);
							})}
						</div>
						<button
							type="button"
							onClick={() => setSelectedIndex((current) => (current + 1) % totalSteps)}
							className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background text-muted-foreground transition hover:text-foreground"
							aria-label="Show next itinerary step"
						>
							<ChevronDown className="size-4" />
						</button>
					</div>

					<div className="overflow-hidden rounded-3xl border border-border/60 bg-background text-foreground shadow-2xl">
						<div className="flex flex-col gap-6 p-4 md:p-4">
							<div className="hidden w-full gap-3 overflow-x-auto pb-2 sm:flex md:hidden">
								{steps.map((step, index) => {
									const isActive = index === selectedIndex;
									return (
										<button
											key={step.id}
											type="button"
											onClick={() => setSelectedIndex(index)}
											className={cn(
												"relative h-20 w-28 shrink-0 overflow-hidden rounded-2xl border",
												isActive ? "border-primary" : "border-border/60 opacity-70"
											)}
										>
											<ImageWithFallback src={step.image || "/images/image-placeholder.png"} alt={step.title} fill sizes="160px" className="object-cover" />
										</button>
									);
								})}
							</div>

							<div className="flex flex-col justify-center gap-4">
								<div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-border/60 bg-muted">
									<ImageWithFallback
										src={selectedStep.image || "/images/image-placeholder.png"}
										alt={selectedStep.title}
										fill
										sizes="(min-width: 1024px) 40vw, 90vw"
										className="object-cover"
										priority
									/>
								</div>
								<div className="space-y-2 px-2 pb-2">
									<h3 className="text-2xl font-semibold text-foreground mb-1">{selectedStep.title}</h3>
									{selectedStep.subtitle ? <p className="text-sm leading-relaxed text-muted-foreground">{selectedStep.subtitle}</p> : null}
								</div>

								<div className="flex gap-3 md:hidden">
									<Button variant="outline" size="sm" onClick={() => setSelectedIndex((current) => (current - 1 + totalSteps) % totalSteps)} className="flex-1">
										Previous
									</Button>
									<Button size="sm" onClick={() => setSelectedIndex((current) => (current + 1) % totalSteps)} className="flex-1">
										Next
									</Button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>,
			document.body
		);
	}, [closeModal, mounted, open, selectedIndex, selectedStep, steps, title, totalSteps]);

	return (
		<>
			{trigger({ open: openModal })}
			{modalContent}
		</>
	);
}
