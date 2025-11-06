"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { SelectField, type SelectOption } from "@/components/ui/select-field";

type Props = {
	experienceId: string;
	currentStatus: "DRAFT" | "PUBLISHED" | "UNPUBLISHED" | "UNLISTED" | "ARCHIVED";
	verificationStatus: "NOT_SUBMITTED" | "PENDING" | "VERIFIED" | "REJECTED";
	hasActiveBookings: boolean;
};

export function ExperienceStatusControl({ experienceId, currentStatus, verificationStatus, hasActiveBookings }: Props) {
	const router = useRouter();
	const [value, setValue] = useState<string>(currentStatus);
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);

	const options: SelectOption[] = useMemo(() => {
		const canPublish = verificationStatus === "VERIFIED";
		// Unpublish only meaningful from PUBLISHED and when there are NO active future bookings
		const canUnpublish = currentStatus === "PUBLISHED" && !hasActiveBookings;
		// Unlist allowed only when there ARE active future bookings (and not from DRAFT/UNPUBLISHED)
		const canUnlist = currentStatus !== "DRAFT" && currentStatus !== "UNPUBLISHED" && hasActiveBookings;
		// Archive only allowed when not PUBLISHED and not UNLISTED
		const canArchive = currentStatus !== "PUBLISHED" && currentStatus !== "UNLISTED";

		const canDraft = currentStatus === "UNPUBLISHED" || currentStatus === "ARCHIVED";
		const showDraft = verificationStatus === "NOT_SUBMITTED";
		const base: SelectOption[] = [];
		if (showDraft) {
			base.push({ label: "Draft", value: "DRAFT", disabled: !canDraft });
		}
		base.push(
			{ label: "Published", value: "PUBLISHED", disabled: !canPublish },
			{ label: "Unpublished", value: "UNPUBLISHED", disabled: !canUnpublish },
			{ label: "Unlisted", value: "UNLISTED", disabled: !canUnlist },
			{ label: "Archived", value: "ARCHIVED", disabled: !canArchive }
		);
		// When pending verification, prepend an empty placeholder option
		if (verificationStatus === "PENDING") {
			return [{ label: "", value: "", disabled: true }, ...base];
		}
		return base;
	}, [verificationStatus, hasActiveBookings, currentStatus]);

	const submit = (next: string) => {
		if (next === currentStatus) return;
		setError(null);
		startTransition(async () => {
			try {
				const res = await fetch("/api/organizer/experiences/update-status", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ experienceId, nextStatus: next }),
				});
				if (!res.ok) {
					const payload = (await res.json().catch(() => null)) as { message?: string } | null;
					throw new Error(payload?.message ?? "Failed to update status");
				}
				router.refresh();
			} catch (e) {
				setError(e instanceof Error ? e.message : "Unable to update status");
			}
		});
	};

	const selectedValue = verificationStatus === "PENDING" ? "" : value;

	return (
		<div className="flex items-center gap-2">
			<SelectField
				name="nextStatus"
				className="h-9 w-44"
				disabled={verificationStatus === "PENDING" || pending}
				value={selectedValue}
				onChange={(e) => {
					const next = e.currentTarget.value;
					if (!next) return; // ignore placeholder
					setValue(next);
					submit(next);
				}}
				options={options}
			/>
			{pending ? <span className="text-xs text-muted-foreground">Updating…</span> : null}
			{error ? <span className="text-xs text-destructive">{error}</span> : null}
		</div>
	);
}
