"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import CtaButton from "@/components/ui/cta-button";
import { ExperienceWizard, type ExperienceWizardInitialData } from "./experience-wizard";
import BalloonLoading from "@/components/ui/balloon-loading";
import { CtaIconButton } from "@/components/ui/cta-icon-button";
import { Pencil } from "lucide-react";

type CategoryOption = { id: string; name: string };
type LocationCountry = {
	id: string;
	name: string;
	states: { id: string; name: string; cities: { id: string; name: string; latitude: number; longitude: number }[] }[];
	cities: { id: string; name: string; latitude: number; longitude: number }[];
};

type CurrencyResponse = { currency: string };

export function EditExperienceModal({
	experienceId,
	label = "Edit details",
	color = "black",
	size = "sm",
	children,
	className,
	initialStep,
	enableVerification,
	sessionsOnly,
}: {
	experienceId: string;
	label?: string;
	color?: "black" | "white" | "whiteBorder";
	size?: "sm" | "md" | "lg" | "icon";
	children?: React.ReactNode;
	className?: string;
	initialStep?: number;
	enableVerification?: boolean;
	sessionsOnly?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [mounted, setMounted] = useState(false);
	const [categories, setCategories] = useState<CategoryOption[] | null>(null);
	const [countries, setCountries] = useState<LocationCountry[] | null>(null);
	const [currency, setCurrency] = useState<string | null>(null);
	const [initial, setInitial] = useState<ExperienceWizardInitialData | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => setMounted(true), []);

	const handleClose = useCallback(() => setOpen(false), []);

	useEffect(() => {
		if (!open) return;
		let aborted = false;
		async function loadAll() {
			setLoading(true);
			setError(null);
			try {
				const [catRes, locRes, curRes, initRes] = await Promise.all([
					fetch("/api/taxonomy/categories", { cache: "no-store" }),
					fetch("/api/taxonomy/locations", { cache: "no-store" }),
					fetch("/api/me/currency", { cache: "no-store" }),
					fetch(enableVerification ? `/api/admin/experiences/${experienceId}/initial` : `/api/organizer/experiences/${experienceId}/initial`, {
						cache: "no-store",
					}),
				]);
				if (!catRes.ok) throw new Error("Failed to load categories");
				if (!locRes.ok) throw new Error("Failed to load locations");
				if (!curRes.ok) throw new Error("Failed to load currency");
				if (!initRes.ok) throw new Error("Failed to load experience data");
				const catData = (await catRes.json()) as { categories: CategoryOption[] };
				const locData = (await locRes.json()) as { countries: LocationCountry[] };
				const curData = (await curRes.json()) as CurrencyResponse;
				const initData = (await initRes.json()) as { initial: ExperienceWizardInitialData };
				if (aborted) return;
				setCategories(catData.categories);
				setCountries(locData.countries);
				setCurrency(curData.currency);
				setInitial(initData.initial);
			} catch (cause) {
				if (aborted) return;
				setError(cause instanceof Error ? cause.message : "Failed to load data");
			} finally {
				if (!aborted) setLoading(false);
			}
		}
		loadAll();
		return () => {
			aborted = true;
		};
	}, [open, experienceId]);

	const modalContent =
		!mounted || !open
			? null
			: createPortal(
					<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 py-10" role="dialog" aria-modal="true">
						<div className="relative h-full max-h-[90vh] w-full max-w-7xl overflow-hidden rounded-2xl border border-border/70 bg-background shadow-2xl">
							{error ? (
								<div className="flex h-full items-center justify-center p-8">
									<p className="text-sm text-destructive">{error}</p>
								</div>
							) : loading || !categories || !countries || !initial ? (
								<div className="flex h-full items-center justify-center p-8">
									<BalloonLoading sizeClassName="w-20" label="Loading" />
								</div>
							) : (
								<ExperienceWizard
									mode="edit"
									categories={categories}
									countries={countries}
									initialData={initial}
									experienceId={experienceId}
									onClose={handleClose}
									initialStep={initialStep}
									verificationStep={
										enableVerification
											? {
													enabled: true,
													onApprove: async () => {
														const res = await fetch(`/api/admin/experiences/${experienceId}/verify`, {
															method: "POST",
															headers: { "content-type": "application/json" },
															body: JSON.stringify({ action: "APPROVE" }),
														});
														if (!res.ok) {
															const payload = (await res.json().catch(() => null)) as { message?: string } | null;
															throw new Error(payload?.message ?? "Approval failed");
														}
													},
													onReject: async (note: string) => {
														const res = await fetch(`/api/admin/experiences/${experienceId}/verify`, {
															method: "POST",
															headers: { "content-type": "application/json" },
															body: JSON.stringify({ action: "REJECT", note }),
														});
														if (!res.ok) {
															const payload = (await res.json().catch(() => null)) as { message?: string } | null;
															throw new Error(payload?.message ?? "Rejection failed");
														}
													},
											  }
											: undefined
									}
									sessionsOnly={Boolean(sessionsOnly)}
								/>
							)}
						</div>
					</div>,
					document.body
			  );

	return (
		<>
			{size === "icon" ? (
				<CtaIconButton size="md" color={color} onClick={() => setOpen(true)} className={className} ariaLabel={typeof label === "string" ? label : "Edit"}>
					{children ?? <Pencil />}
				</CtaIconButton>
			) : (
				<CtaButton size={size as "sm" | "md" | "lg"} color={color} onClick={() => setOpen(true)} className={className}>
					{children ?? label}
				</CtaButton>
			)}
			{modalContent}
		</>
	);
}
