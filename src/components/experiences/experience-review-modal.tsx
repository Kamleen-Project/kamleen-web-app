"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CtaButton } from "@/components/ui/cta-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ExperienceReviewModalProps = {
	experienceId: string;
	experienceTitle: string;
};

export function ExperienceReviewModal({ experienceId, experienceTitle }: ExperienceReviewModalProps) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [rating, setRating] = useState(5);
	const [hoveredRating, setHoveredRating] = useState<number | null>(null);
	const [comment, setComment] = useState("");
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);

		startTransition(async () => {
			setError(null);
			setMessage(null);

			const response = await fetch(`/api/experiences/${experienceId}/reviews`, {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				const data = await response.json().catch(() => ({ message: "Unable to submit review" }));
				setError(data.message ?? "Unable to submit review");
				return;
			}

			setMessage("Thanks for sharing your experience!");
			setRating(5);
			setHoveredRating(null);
			setComment("");
			router.refresh();
		});
	}

	const activeRating = hoveredRating ?? rating;
	const ratingLabelId = "experience-review-rating-label";

	return (
		<>
			<CtaButton color="whiteBorder" size="md" startIcon={<Star className="size-4" />} onClick={() => setOpen(true)}>
				Leave a review
			</CtaButton>
			{open ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div className="relative w-full max-w-lg rounded-2xl border border-border/60 bg-background p-6 shadow-xl">
						<button type="button" className="absolute right-4 top-4 text-sm text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
							Close
						</button>
						<div className="space-y-1">
							<h2 className="text-xl font-semibold text-foreground">Share your experience</h2>
							<p className="text-sm text-muted-foreground">
								Tell future explorers what you loved about <span className="font-medium text-foreground">{experienceTitle}</span>.
							</p>
						</div>
						<form onSubmit={handleSubmit} className="mt-4 space-y-6">
							<input type="hidden" name="experienceId" value={experienceId} />
							<div className="space-y-3">
								<div className="space-y-2">
									<Label id={ratingLabelId}>Rating (1-5)</Label>
									<div role="radiogroup" aria-labelledby={ratingLabelId} className="flex items-center gap-1" onMouseLeave={() => setHoveredRating(null)}>
										{Array.from({ length: 5 }, (_, index) => {
											const value = index + 1;
											const isChecked = rating === value;
											const isActive = activeRating >= value;
											return (
												<label
													key={value}
													className={cn(
														"flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition",
														isActive ? "bg-amber-500/10 text-amber-500" : "bg-muted text-muted-foreground"
													)}
													onMouseEnter={() => setHoveredRating(value)}
												>
													<input type="radio" name="rating" value={value} checked={isChecked} onChange={() => setRating(value)} className="sr-only" required />
													<span className="sr-only">
														{value} star{value === 1 ? "" : "s"}
													</span>
													<Star
														size={20}
														strokeWidth={1.5}
														className={cn("transition", isActive ? "fill-amber-500 text-amber-500" : "text-muted-foreground")}
													/>
												</label>
											);
										})}
									</div>
								</div>
								<div className="space-y-2">
									<Label htmlFor="experience-review-comment">What made {experienceTitle} memorable?</Label>
									<Textarea
										name="comment"
										id="experience-review-comment"
										placeholder="Share highlights, host shout-outs, or tips for future explorers."
										rows={5}
										value={comment}
										onChange={(event) => setComment(event.target.value)}
									/>
								</div>
							</div>
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<p className="text-xs text-muted-foreground">Reviews help explorers decide what to book next. Keep it kind and constructive.</p>
								<div className="flex items-center gap-2">
									<CtaButton type="button" color="whiteBorder" onClick={() => setOpen(false)}>
										Cancel
									</CtaButton>
									<CtaButton type="submit" color="black" disabled={pending} className={cn(pending && "opacity-80")}>
										Submit review
									</CtaButton>
								</div>
							</div>
							{message ? <p className="text-sm text-emerald-600">{message}</p> : null}
							{error ? <p className="text-sm text-destructive">{error}</p> : null}
						</form>
					</div>
				</div>
			) : null}
		</>
	);
}
