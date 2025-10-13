"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ExperienceCard, type Experience } from "@/components/cards/experience-card";
import { Button } from "@/components/ui/button";
import BalloonLoading from "@/components/ui/balloon-loading";

type ExperienceGridProps = {
	initialExperiences: Experience[];
	initialHasMore: boolean;
	searchParams: Record<string, string | undefined>;
};

type ApiResponse = {
	experiences: Experience[];
	hasMore: boolean;
};

function serializeSearchParams(searchParams: Record<string, string | undefined>, page: number, pageSize: number) {
	const params = new URLSearchParams();
	Object.entries(searchParams).forEach(([key, value]) => {
		if (value) {
			params.set(key, value);
		}
	});
	params.set("page", String(page));
	params.set("pageSize", String(pageSize));
	return params.toString();
}

const PAGE_SIZE = 6;

export function ExperienceGrid({ initialExperiences, initialHasMore, searchParams }: ExperienceGridProps) {
	const [experiences, setExperiences] = useState(initialExperiences);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(initialHasMore);
	const [loading, setLoading] = useState(false);
	const sentinelRef = useRef<HTMLDivElement | null>(null);
	const searchSignature = useMemo(() => JSON.stringify(searchParams), [searchParams]);

	useEffect(() => {
		setExperiences(initialExperiences);
		setPage(1);
		setHasMore(initialHasMore);
	}, [initialExperiences, initialHasMore, searchSignature]);

	const loadMore = useCallback(async () => {
		if (loading || !hasMore) return;
		setLoading(true);
		try {
			const nextPage = page + 1;
			const query = serializeSearchParams(searchParams, nextPage, PAGE_SIZE);
			const response = await fetch(`/api/experiences?${query}`, { cache: "no-store" });

			if (!response.ok) {
				throw new Error("Failed to fetch more experiences");
			}

			const data = (await response.json()) as ApiResponse;
			setExperiences((prev) => [...prev, ...data.experiences]);
			setPage(nextPage);
			setHasMore(data.hasMore);
		} catch (error) {
			console.error(error);
			setHasMore(false);
		} finally {
			setLoading(false);
		}
	}, [hasMore, loading, page, searchParams]);

	useEffect(() => {
		if (!hasMore) return;
		const sentinel = sentinelRef.current;
		if (!sentinel) return;

		const observer = new IntersectionObserver((entries) => {
			const [entry] = entries;
			if (entry.isIntersecting) {
				loadMore();
			}
		});

		observer.observe(sentinel);

		return () => {
			observer.disconnect();
		};
	}, [hasMore, loadMore, searchSignature]);

	return (
		<div className="space-y-8">
			{experiences.length ? (
				<div className="grid gap-6 md:grid-cols-4">
					{experiences.map((experience) => (
						<ExperienceCard key={experience.id} experience={experience} />
					))}
				</div>
			) : (
				<div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
					No experiences match your filters yet. Try adjusting your search or check back soon.
				</div>
			)}

			<div className="flex flex-col items-center gap-4">
				{hasMore ? (
					loading ? (
						<BalloonLoading sizeClassName="w-14" label="Loading more experiences" />
					) : (
						<Button onClick={loadMore} disabled={loading} variant="outline">
							Load more
						</Button>
					)
				) : null}
				<div ref={sentinelRef} className="h-1 w-full" aria-hidden />
			</div>
		</div>
	);
}

export function ExperienceGridSkeleton() {
	return (
		<div className="grid gap-6 md:grid-cols-4">
			{Array.from({ length: PAGE_SIZE }).map((_, index) => (
				<div key={index} className="min-h-[420px] animate-pulse rounded-2xl border border-border/60 bg-card/60" />
			))}
		</div>
	);
}
