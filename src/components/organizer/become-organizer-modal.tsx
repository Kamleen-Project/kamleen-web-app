"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { Button, buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import BalloonLoading from "@/components/ui/balloon-loading";

import { ExperienceWizard } from "./experience-wizard";

type CategoryOption = { id: string; name: string };
type LocationCountry = {
	id: string;
	name: string;
	states: { id: string; name: string; cities: { id: string; name: string; latitude: number; longitude: number }[] }[];
	cities: { id: string; name: string; latitude: number; longitude: number }[];
};

type CurrencyResponse = { currency: string };

export function BecomeOrganizerModal({
	triggerLabel = "Become an organizer",
	className,
	variant = "default",
	size = "default",
}: {
	triggerLabel?: string;
	className?: string;
	variant?: VariantProps<typeof buttonVariants>["variant"];
	size?: VariantProps<typeof buttonVariants>["size"];
}) {
	const router = useRouter();
	const { data: session, status, update } = useSession();
	const [open, setOpen] = useState(false);
	const [mounted, setMounted] = useState(false);
	const [categories, setCategories] = useState<CategoryOption[] | null>(null);
	const [countries, setCountries] = useState<LocationCountry[] | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [currency, setCurrency] = useState<string | null>(null);

	const organizerStatus = session?.user.organizerStatus ?? "NOT_APPLIED";
	const isPendingRequest = organizerStatus === "PENDING";
	const isApprovedOrganizer = organizerStatus === "APPROVED";
	const isLoadingSession = status === "loading";
	const triggerText = useMemo(() => {
		if (isPendingRequest) return "Organizer request pending";
		if (isApprovedOrganizer) return "Organizer access granted";
		return triggerLabel;
	}, [isApprovedOrganizer, isPendingRequest, triggerLabel]);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setOpen(false);
			}
		}

		if (open) {
			document.addEventListener("keydown", handleKeyDown);
			document.body.classList.add("overflow-hidden");
		}

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.body.classList.remove("overflow-hidden");
		};
	}, [open]);

	const handleClose = useCallback(() => {
		setOpen(false);
	}, []);

	const handleSuccess = useCallback(() => {
		setOpen(false);
		if (update) {
			void update({ organizerStatus: "PENDING" });
		}
		router.push("/dashboard/explorer");
	}, [router, update]);

	useEffect(() => {
		if (!open || isPendingRequest || isApprovedOrganizer) return;
		let aborted = false;
		async function loadTaxonomy() {
			setLoading(true);
			setError(null);
			try {
				const [catRes, locRes, curRes] = await Promise.all([
					fetch("/api/taxonomy/categories", { cache: "no-store" }),
					fetch("/api/taxonomy/locations", { cache: "no-store" }),
					fetch("/api/me/currency", { cache: "no-store" }),
				]);
				if (!catRes.ok) throw new Error("Failed to load categories");
				if (!locRes.ok) throw new Error("Failed to load locations");
				if (!curRes.ok) throw new Error("Failed to load currency");
				const catData = (await catRes.json()) as { categories: CategoryOption[] };
				const locData = (await locRes.json()) as { countries: LocationCountry[] };
				const curData = (await curRes.json()) as CurrencyResponse;
				if (aborted) return;
				setCategories(catData.categories);
				setCountries(locData.countries);
				setCurrency(curData.currency);
			} catch (cause) {
				if (aborted) return;
				setError(cause instanceof Error ? cause.message : "Failed to load data");
			} finally {
				if (!aborted) setLoading(false);
			}
		}
		loadTaxonomy();
		return () => {
			aborted = true;
		};
	}, [open, isApprovedOrganizer, isPendingRequest]);

	const modalContent =
		!mounted || !open
			? null
			: createPortal(
					<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 py-10" role="dialog" aria-modal="true">
						<div className="relative h-full max-h-[90vh] w-full max-w-7xl overflow-hidden rounded-2xl border border-border/70 bg-background shadow-2xl">
							{isPendingRequest ? (
								<div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
									<h2 className="text-2xl font-semibold text-foreground">Request under review</h2>
									<p className="max-w-xl text-sm text-muted-foreground">
										Thanks for submitting your organizer application. Our team is reviewing it now and we will notify you as soon as it is approved.
									</p>
									<Button onClick={handleClose} className="mt-2">
										Close
									</Button>
								</div>
							) : isApprovedOrganizer ? (
								<div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
									<h2 className="text-2xl font-semibold text-foreground">You are already an organizer</h2>
									<p className="max-w-xl text-sm text-muted-foreground">
										Start building new experiences from your organizer console. Need help? Head to the dashboard to get started.
									</p>
									<Button
										onClick={() => {
											handleClose();
											router.push("/dashboard/organizer");
										}}
										className="mt-2"
									>
										Go to organizer console
									</Button>
								</div>
							) : error ? (
								<div className="flex h-full items-center justify-center p-8">
									<p className="text-sm text-destructive">{error}</p>
								</div>
							) : loading || !categories || !countries ? (
								<div className="flex h-full items-center justify-center p-8">
									<BalloonLoading sizeClassName="w-20" label="Loading" />
								</div>
							) : (
								<ExperienceWizard
									mode="create"
									categories={categories}
									countries={countries}
									currency={currency ?? undefined}
									onClose={handleClose}
									onSuccess={handleSuccess}
									organizerIntro
									submissionMode="organizer-request"
								/>
							)}
						</div>
					</div>,
					document.body
			  );

	return (
		<>
			<Button className={className} variant={variant} size={size} onClick={() => setOpen(true)} disabled={isLoadingSession}>
				{triggerText}
			</Button>
			{modalContent}
		</>
	);
}
