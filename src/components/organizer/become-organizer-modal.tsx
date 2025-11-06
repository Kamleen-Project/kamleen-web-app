"use client";

import { cloneElement, isValidElement, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Session } from "next-auth";
import type { OrganizerStatus } from "@/generated/prisma";
import { useSession } from "next-auth/react";

import { CtaButton } from "@/components/ui/cta-button";
import { X } from "lucide-react";
import BalloonLoading from "@/components/ui/balloon-loading";
import { OrganizerIntroForm } from "./organizer-intro-form";

// No taxonomy required for organizer intro only

export function BecomeOrganizerModal({
	triggerLabel = "Become an organizer",
	className,
	size = "md",
	trigger,
	autoOpen,
}: {
	triggerLabel?: string;
	className?: string;
	size?: "sm" | "md" | "lg";
	trigger?: React.ReactElement<{ disabled?: boolean; onClick?: () => void }>;
	autoOpen?: boolean;
}) {
	const router = useRouter();
	const { data: session, status, update } = useSession();
	const [open, setOpen] = useState(false);
	const [mounted, setMounted] = useState(false);
	const [submitted, setSubmitted] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [resolvedOrganizerStatus, setResolvedOrganizerStatus] = useState<OrganizerStatus | "NOT_APPLIED">(() => {
		const initial = ((session?.user as Session["user"])?.organizerStatus as OrganizerStatus | undefined) ?? "NOT_APPLIED";
		return initial;
	});

	const organizerStatus: OrganizerStatus | "NOT_APPLIED" = resolvedOrganizerStatus;
	const isPendingRequest = organizerStatus === "PENDING";
	const isApprovedOrganizer = organizerStatus === "APPROVED";
	const isLoadingSession = status === "loading";
	const triggerText = useMemo(() => {
		if (isPendingRequest) return "Organizer Request in review";
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
		if (!open) return;
		let cancelled = false;
		async function loadStatus() {
			try {
				setLoading(true);
				setError(null);
				const res = await fetch("/api/me/organizer-status", { cache: "no-store" });
				if (!res.ok) return;
				const data = (await res.json().catch(() => null)) as { organizerStatus?: OrganizerStatus | "NOT_APPLIED" } | null;
				if (!cancelled && data?.organizerStatus) {
					setResolvedOrganizerStatus(data.organizerStatus);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		loadStatus();
		return () => {
			cancelled = true;
		};
	}, [open]);

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
		setSubmitted(false);
	}, []);

	const handleSuccess = useCallback(() => {
		setSubmitted(true);
		setResolvedOrganizerStatus("PENDING");
		// Do not close or redirect or update session; keep modal open showing success
	}, []);

	useEffect(() => {
		if (!open || isPendingRequest || isApprovedOrganizer) return;
		setLoading(false);
		setError(null);
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
							{submitted ? (
								<div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
									<h2 className="text-2xl font-semibold text-foreground">Application submitted</h2>
									<p className="max-w-xl text-sm text-muted-foreground">Your organizer request was sent successfully. We’ll notify you after review.</p>
									<CtaButton onClick={handleClose} className="mt-2">
										Close
									</CtaButton>
								</div>
							) : isPendingRequest ? (
								<div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
									<h2 className="text-2xl font-semibold text-foreground">Request in review</h2>
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
							) : loading ? (
								<div className="flex h-full items-center justify-center p-8">
									<BalloonLoading sizeClassName="w-20" label="Loading" />
								</div>
							) : (
								<OrganizerIntroForm onSuccess={handleSuccess} />
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
