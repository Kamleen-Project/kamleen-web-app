import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExperienceReviewModal } from "@/components/experiences/experience-review-modal";

type ReviewExplorer = {
	name?: string | null;
	image?: string | null;
};

export type ExperienceReview = {
	id: string;
	rating: number;
	comment?: string | null;
	createdAt: Date;
	explorer?: ReviewExplorer | null;
};

type ExperienceReviewsSectionProps = {
	title: string;
	averageRating: number;
	reviewCount: number;
	reviews: ExperienceReview[];
	showMoreHref?: string;
	experienceId?: string;
};

function formatTimeAgo(date: Date) {
	const now = Date.now();
	const value = typeof date === "string" ? new Date(date).getTime() : date.getTime();
	if (Number.isNaN(value)) {
		return "";
	}

	let diffSeconds = Math.round((value - now) / 1000);
	const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

	const divisions: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
		{ amount: 60, unit: "second" },
		{ amount: 60, unit: "minute" },
		{ amount: 24, unit: "hour" },
		{ amount: 7, unit: "day" },
		{ amount: 4.34524, unit: "week" },
		{ amount: 12, unit: "month" },
		{ amount: Number.POSITIVE_INFINITY, unit: "year" },
	];

	for (const division of divisions) {
		if (Math.abs(diffSeconds) < division.amount) {
			return rtf.format(Math.round(diffSeconds), division.unit);
		}
		diffSeconds /= division.amount;
	}

	return "";
}

function getInitials(name?: string | null) {
	if (!name) {
		return "";
	}
	return name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part.charAt(0).toUpperCase())
		.join("");
}

function renderStars(value: number) {
	return Array.from({ length: 5 }, (_, index) => {
		const filled = value >= index + 1;
		const active = value > index;
		return (
			<Star key={index} className={cn("size-4", active ? "text-amber-500" : "text-muted-foreground/60", filled ? "fill-amber-500" : "")} strokeWidth={1.5} />
		);
	});
}

export function ExperienceReviewsSection({ title, averageRating, reviewCount, reviews, showMoreHref, experienceId }: ExperienceReviewsSectionProps) {
	const limitedReviews = reviews.slice(0, 6);
	const hasMore = reviewCount > limitedReviews.length && Boolean(showMoreHref);

	return (
		<section
			id="experience-reviews"
			aria-labelledby="experience-reviews-heading"
			className="space-y-8 rounded-2xl border border-border/60 bg-background/80 p-8 shadow-sm"
		>
			<div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 id="experience-reviews-heading" className="text-2xl font-semibold text-foreground">
						Reviews
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">What explorers say about {title}</p>
				</div>
				<div className="flex flex-col items-start gap-2 text-foreground sm:items-end">
					<div className="flex items-center gap-3">
						<p className="text-3xl font-semibold">{averageRating.toFixed(2)}</p>
						<div>
							<div className="flex items-center gap-1">{renderStars(averageRating)}</div>
							<p className="text-xs text-muted-foreground">
								Based on {reviewCount} review{reviewCount === 1 ? "" : "s"}
							</p>
						</div>
					</div>
					{experienceId ? <ExperienceReviewModal experienceId={experienceId} experienceTitle={title} /> : null}
				</div>
			</div>

			{limitedReviews.length ? (
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{limitedReviews.map((review) => {
						const explorerName = review.explorer?.name ?? "Explorer";
						const initials = getInitials(explorerName);
						const createdAt = review.createdAt instanceof Date ? review.createdAt : new Date(review.createdAt);

						return (
							<article key={review.id} className="flex h-full flex-col gap-4 rounded-xl border border-border/60 bg-muted/40 p-5">
								<div className="flex items-center gap-3">
									<div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-background">
										{review.explorer?.image ? (
											<Image src={review.explorer.image} alt={`${explorerName}'s avatar`} fill sizes="48px" className="object-cover" />
										) : initials ? (
											<span className="text-sm font-semibold text-foreground">{initials}</span>
										) : (
											<span className="text-xs text-muted-foreground">No avatar</span>
										)}
									</div>
									<div className="flex flex-col">
										<p className="text-sm font-medium text-foreground">{explorerName}</p>
										<p className="text-xs text-muted-foreground">{formatTimeAgo(createdAt)}</p>
									</div>
								</div>
								<div className="flex items-center gap-2 text-sm font-medium text-foreground">
									<div className="flex items-center gap-1">{renderStars(review.rating)}</div>
									<span className="text-muted-foreground">{review.rating.toFixed(1)} / 5</span>
								</div>
								{review.comment ? <p className="text-sm leading-relaxed text-muted-foreground">{review.comment}</p> : null}
							</article>
						);
					})}
				</div>
			) : (
				<div className="rounded-xl border border-dashed border-border/60 bg-muted/40 p-8 text-center text-sm text-muted-foreground">
					Reviews will appear here once explorers start sharing their experiences.
				</div>
			)}

			{hasMore ? (
				<div className="flex justify-center">
					<Button variant="outline" size="lg" asChild>
						<Link href={showMoreHref!}>Show more reviews</Link>
					</Button>
				</div>
			) : null}
		</section>
	);
}
