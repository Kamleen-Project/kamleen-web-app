"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CtaIconButton } from "@/components/ui/cta-icon-button";
import { Check, X } from "lucide-react";

export function OrganizerRequestActions({ userId, userRole }: { userId: string; userRole: string }) {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	function updateRequest(nextStatus: "APPROVED" | "REJECTED") {
		startTransition(async () => {
			setError(null);
			setMessage(null);
			const payload: Record<string, string> = {
				organizerStatus: nextStatus,
				activeRole: nextStatus === "APPROVED" ? "ORGANIZER" : "EXPLORER",
			};
			if (nextStatus === "APPROVED" && userRole !== "ADMIN") {
				payload.role = "ORGANIZER";
			}

			const response = await fetch(`/api/admin/users/${userId}`, {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const data = (await response.json().catch(() => null)) as { message?: string } | null;
				setError(data?.message ?? "Unable to update request");
				return;
			}

			setMessage(nextStatus === "APPROVED" ? "Request approved" : "Request rejected");
			router.refresh();
		});
	}

	return (
		<div className="flex flex-col items-stretch gap-2">
			<div className="flex gap-2">
				<CtaIconButton size="md" color="black" onClick={() => updateRequest("APPROVED")} isLoading={pending} ariaLabel="Approve organizer request">
					<Check />
				</CtaIconButton>
				<CtaIconButton size="md" color="red" onClick={() => updateRequest("REJECTED")} isLoading={pending} ariaLabel="Reject organizer request">
					<X />
				</CtaIconButton>
			</div>
			{error ? <p className="text-xs text-destructive">{error}</p> : null}
			{!error && message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
		</div>
	);
}
