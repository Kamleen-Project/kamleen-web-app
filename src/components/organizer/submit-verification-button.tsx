"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function SubmitVerificationButton({
	experienceId,
	verificationStatus,
}: {
	experienceId: string;
	verificationStatus: "NOT_SUBMITTED" | "PENDING" | "VERIFIED" | "REJECTED";
}) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);

	// Hide completely when already verified
	if (verificationStatus === "VERIFIED") return null;

	const disabled = verificationStatus === "PENDING";

	const handleSubmit = () => {
		startTransition(async () => {
			setError(null);
			try {
				const res = await fetch("/api/organizer/experiences/submit-verification", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ experienceId }),
				});
				if (!res.ok) {
					const payload = (await res.json().catch(() => null)) as { message?: string } | null;
					throw new Error(payload?.message ?? "Unable to submit for verification");
				}
				router.refresh();
			} catch (e) {
				setError(e instanceof Error ? e.message : "Unable to submit for verification");
			}
		});
	};

	return (
		<div className="flex items-center gap-2">
			<Button type="button" size="sm" onClick={handleSubmit} disabled={pending || disabled}>
				{verificationStatus === "PENDING" ? "Pending verification" : pending ? "Submitting…" : "Submit for verification"}
			</Button>
			{error ? <span className="text-xs text-destructive">{error}</span> : null}
		</div>
	);
}
