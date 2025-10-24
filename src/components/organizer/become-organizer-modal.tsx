"use client";

import { cloneElement, isValidElement, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Session } from "next-auth";
import type { OrganizerStatus } from "@/generated/prisma";
import { useSession } from "next-auth/react";

import { buttonVariants } from "@/components/ui/button";
import { CtaButton } from "@/components/ui/cta-button";
import { X } from "lucide-react";
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
	trigger,
	autoOpen,
}: {
	triggerLabel?: string;
	className?: string;
	variant?: VariantProps<typeof buttonVariants>["variant"];
	size?: VariantProps<typeof buttonVariants>["size"];
	trigger?: React.ReactElement<{ disabled?: boolean; onClick?: () => void }>;
	autoOpen?: boolean;
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

	const organizerStatus: OrganizerStatus | "NOT_APPLIED" =
		((session?.user as Session["user"])?.organizerStatus as OrganizerStatus | undefined) ?? "NOT_APPLIED";
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
		if (autoOpen && mounted) {
			setOpen(true);
		}
	}, [autoOpen, mounted]);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setOpen(false);
			}
		}

		if (open) {
			document.addEventListener("keydown", handleKeyDown);
			document.body.classList.add("overflow-hidden");
			document.body.classList.add("modal-open");
		}

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.body.classList.remove("overflow-hidden");
			document.body.classList.remove("modal-open");
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
							{/* <CtaButton asChild size="sm" color="white" className="absolute right-3 top-3">
								<button type="button" aria-label="Close modal" onClick={handleClose}>
									<X className="h-4 w-4" />
								</button>
							</CtaButton> */}
							{isPendingRequest ? (
								<div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
									<h2 className="text-2xl font-semibold text-foreground">Request under review</h2>
									<p className="max-w-xl text-sm text-muted-foreground">
										Thanks for submitting your organizer application. Our team is reviewing it now and we will notify you as soon as it is approved.
									</p>
									<CtaButton onClick={handleClose} className="mt-2">
										Close
									</CtaButton>
								</div>
							) : isApprovedOrganizer ? (
								<div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
									<h2 className="text-2xl font-semibold text-foreground">You are already an organizer</h2>
									<p className="max-w-xl text-sm text-muted-foreground">
										Start building new experiences from your organizer console. Need help? Head to the dashboard to get started.
									</p>
									<CtaButton
										onClick={() => {
											handleClose();
											router.push("/dashboard/organizer");
										}}
										className="mt-2"
									>
										Go to organizer console
									</CtaButton>
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

	if (trigger && isValidElement(trigger)) {
		const triggerEl = cloneElement(trigger, {
			onClick: () => setOpen(true),
			disabled: isLoadingSession || Boolean(trigger.props.disabled),
		});
		return (
			<>
				{triggerEl}
				{modalContent}
			</>
		);
	}

	return (
		<>
			<CtaButton
				className={className}
				onClick={() => setOpen(true)}
				disabled={isLoadingSession}
				// map common sizes from shadcn to CTA sizes
				size={size === "sm" ? "sm" : size === "lg" ? "lg" : "md"}
			>
				{triggerText}
			</CtaButton>
			{modalContent}
		</>
	);
}
