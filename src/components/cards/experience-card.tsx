"use client";

import { formatCurrency } from "@/lib/format-currency";
import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, Star } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import CtaIconButton from "@/components/ui/cta-icon-button";
import { useNotifications } from "@/components/providers/notification-provider";

export interface Experience {
	id: string;
	title: string;
	description?: string;
	location: string;
	rating: number;
	reviews: number;
	price: number;
	image?: string;
	currency?: string;
	slug: string;
	duration?: string;
	tags?: string[];
	sessions?: Array<{
		id: string;
		startAt: string;
	}>;
}

interface ExperienceCardProps {
	experience: Experience;
	className?: string;
}

export function ExperienceCard({ experience, className }: ExperienceCardProps) {
	const rating = typeof experience.rating === "number" ? experience.rating : 0;
	const reviews = typeof experience.reviews === "number" ? experience.reviews : 0;
	const hasReviews = reviews > 0;
	const currency = experience.currency ?? "USD";
	const formattedPrice = formatCurrency(experience.price, experience.currency);

	const now = new Date();
	const upcomingDate = experience.sessions
		? experience.sessions
			.map((session) => new Date(session.startAt))
			.filter((date) => !Number.isNaN(date.getTime()) && date >= now)
			.sort((a, b) => a.getTime() - b.getTime())[0] ?? null
		: null;

	const formattedUpcomingDate = upcomingDate ? upcomingDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;

	const router = useRouter();
	const { notify } = useNotifications();
	const [isPending, startTransition] = useTransition();
	const [saved, setSaved] = useState<boolean>(false);

	useEffect(() => {
		let isMounted = true;
		const loadSaved = async () => {
			try {
				const res = await fetch(`/api/experiences/${experience.id}/save`, { cache: "no-store" });
				if (!res.ok) return;
				const data = (await res.json()) as { saved?: boolean };
				if (isMounted) setSaved(Boolean(data.saved));
			} catch {
				// ignore
			}
		};
		loadSaved();
		return () => {
			isMounted = false;
		};
	}, [experience.id]);

	const toggleSaved = () => {
		startTransition(async () => {
			const next = !saved;
			setSaved(next);
			try {
				const method = next ? "POST" : "DELETE";
				const res = await fetch(`/api/experiences/${experience.id}/save`, { method });
				if (res.status === 401) {
					router.push("/login");
					setSaved(!next);
					return;
				}
				if (!res.ok) {
					// revert on failure
					setSaved(!next);
					return;
				}
				// Success toast
				notify({
					title: next ? "Added to wishlist" : "Removed from wishlist",
					message: next ? "We saved this experience in your wishlist." : "We removed this experience from your wishlist.",
				});
			} catch {
				setSaved(!next);
			}
		});
	};

	return (
		<div className={cn("flex h-full w-full min-h-[340px] flex-col", className)}>
			<Link href={`/experiences/${experience.slug}`} className="group relative block aspect-[4/3] w-full overflow-hidden rounded-lg">
				<FallbackCover
					src={experience.image ?? "/images/exp-placeholder.png"}
					alt={experience.title}
					sizes="(min-width: 1024px) 360px, (min-width: 768px) 33vw, 100vw"
				/>
				<div className="pointer-events-none absolute inset-0" />
				{formattedUpcomingDate ? (
					<div className="absolute left-4 top-4 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-foreground backdrop-blur">
						{formattedUpcomingDate}
					</div>
				) : null}
				<div className="absolute right-4 top-4">
					<CtaIconButton
						color="white"
						size="md"
						ariaLabel={saved ? "Remove from wishlist" : "Add to wishlist"}
						className="bg-background/80 text-foreground hover:bg-background/90 backdrop-blur"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							toggleSaved();
						}}
						disabled={isPending}
						isLoading={isPending}
					>
						<Heart className={cn("size-4 transition-colors", saved ? "fill-red-500 text-red-500" : "text-foreground")} />
					</CtaIconButton>
				</div>
			</Link>
			<div className="mt-2 flex flex-col gap-1">
				<h3 className="text-md font-semibold tracking-tight">
					<Link href={`/experiences/${experience.slug}`} className="transition-colors hover:text-primary">
						{experience.title}
					</Link>
				</h3>
				<div className="flex items-center gap-1 text-sm text-muted-foreground">
					<MapPin className="size-4" />
					<span>{experience.location}</span>
				</div>
			</div>
			<div className="mt-1 flex w-full flex-wrap items-center justify-between gap-3 text-sm">
				<div className="flex items-center gap-1 text-amber-500">
					<div className="flex items-center gap-1">
						<Star className="size-3 fill-current" />
						<span className="font-medium">{rating.toFixed(1)}</span>
					</div>
					{/* {hasReviews ? (
						<span className="text-muted-foreground">({reviews} reviews)</span>
					) : (
						<Badge variant="soft" className="text-[11px] uppercase tracking-wide text-primary">
							New
						</Badge>
					)} */}
				</div>
				<div className="flex items-baseline gap-1 text-right">
					<span className="text-base font-semibold">{formattedPrice}</span>
					<span className="text-xs text-muted-foreground">/ guest</span>
				</div>
			</div>
		</div>
	);
}

function FallbackCover({ src, alt, sizes }: { src: string; alt: string; sizes: string }) {
	const [imageSrc, setImageSrc] = useState<string>(src);
	return (
		<Image
			src={imageSrc}
			alt={alt}
			fill
			sizes={sizes}
			className="object-cover transition-transform duration-300 ease-out group-hover:scale-110"
			onError={() => setImageSrc("/images/exp-placeholder.png")}
		/>
	);
}
