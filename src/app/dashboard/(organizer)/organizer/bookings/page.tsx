"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Check, AlertCircle } from "lucide-react";

import { OrganizerBookingExperienceCard } from "@/components/organizer/organizer-booking-experience-card";
import { ConsolePage } from "@/components/console/page";
import BalloonLoading from "@/components/ui/balloon-loading";
import CtaButton from "@/components/ui/cta-button";

const STATUS_FILTERS = [
	{ label: "All", value: "ALL" },
	{ label: "Pending", value: "PENDING" },
	{ label: "Confirmed", value: "CONFIRMED" },
	{ label: "Cancelled", value: "CANCELLED" },
] as const;

type StatusValue = (typeof STATUS_FILTERS)[number]["value"];

type GroupedResponse = {
	experiences: Array<{
		id: string;
		title: string;
		duration?: string | null;
		slug: string;
		currency?: string;
		meetingCity?: string | null;
		location?: string;
		meetingAddress?: string | null;
		sessions: Array<{
			id: string;
			startAt: string;
			duration?: string | null;
			capacity: number;
			locationLabel?: string | null;
			meetingAddress?: string | null;
			reservedActive: number;
			reservedPending: number;
			bookings: Array<{
				id: string;
				status: "PENDING" | "CONFIRMED" | "CANCELLED";
				guests: number;
				totalPrice: number;
				createdAt: string;
				explorer: { name: string | null; email: string | null } | null;
			}>;
		}>;
	}>;
};

export default function OrganizerBookingsPage() {
	const [status, setStatus] = useState<StatusValue>("ALL");
	const [pendingActionId, setPendingActionId] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [actionLoading, startTransition] = useTransition();
	const [data, setData] = useState<GroupedResponse | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [listError, setListError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		setIsLoading(true);
		setListError(null);
		try {
			const searchParams = new URLSearchParams();
			if (status !== "ALL") searchParams.set("status", status);
			const response = await fetch(`/api/organizer/bookings/grouped?${searchParams.toString()}`);
			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as { message?: string } | null;
				throw new Error(payload?.message ?? "Failed to load bookings");
			}
			const payload = (await response.json()) as GroupedResponse;
			// When filtering by specific status, hide sessions (and experiences) that end up with zero bookings
			if (status !== "ALL") {
				const filtered: GroupedResponse = {
					experiences: payload.experiences
						.map((exp) => ({
							...exp,
							sessions: exp.sessions.filter((s) => s.bookings && s.bookings.length > 0),
						}))
						.filter((exp) => exp.sessions.length > 0),
				};
				setData(filtered);
			} else {
				setData(payload);
			}
		} catch (error) {
			setListError(error instanceof Error ? error.message : "Unable to load bookings");
		} finally {
			setIsLoading(false);
		}
	}, [status]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const handleStatusChange = (value: StatusValue) => {
		setStatus(value);
		setSuccessMessage(null);
		setErrorMessage(null);
	};

	const runAction = (bookingId: string, nextStatus: "CONFIRMED" | "CANCELLED") => {
		setErrorMessage(null);
		setSuccessMessage(null);
		setPendingActionId(bookingId);
		startTransition(async () => {
			try {
				const response = await fetch("/api/organizer/bookings/update-status", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ bookingId, status: nextStatus }),
				});

				if (!response.ok) {
					const payload = (await response.json().catch(() => null)) as { message?: string } | null;
					throw new Error(payload?.message ?? "Unable to update booking");
				}

				setSuccessMessage(`Booking marked as ${nextStatus.toLowerCase()}.`);
				await refresh();
			} catch (error) {
				setErrorMessage(error instanceof Error ? error.message : "Unknown error");
			} finally {
				setPendingActionId(null);
			}
		});
	};

	return (
		<ConsolePage title="Bookings" subtitle="Grouped by experience and session with capacity utilization.">
			<div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/80 p-2 mb-4">
				{STATUS_FILTERS.map((item) => {
					const isActive = status === item.value;
					return (
						<CtaButton
							key={item.value}
							type="button"
							color={isActive ? "black" : "whiteBorder"}
							size="sm"
							onClick={() => handleStatusChange(item.value)}
							className="text-xs"
						>
							{item.label}
						</CtaButton>
					);
				})}
			</div>

			{listError ? (
				<div className="mt-6 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
					<AlertCircle className="size-4" />
					<span>{listError}</span>
				</div>
			) : null}

			{errorMessage ? (
				<div className="mt-6 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
					<AlertCircle className="size-4" />
					<span>{errorMessage}</span>
				</div>
			) : null}

			{successMessage ? (
				<div className="mt-6 flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-100/40 p-3 text-sm text-emerald-600">
					<Check className="size-4" />
					<span>{successMessage}</span>
				</div>
			) : null}

			{isLoading ? (
				<div className="flex items-center justify-center py-12 text-muted-foreground">
					<BalloonLoading sizeClassName="w-20" label="Loading bookings" />
				</div>
			) : data && data.experiences.length ? (
				<div className="space-y-6">
					{data.experiences.map((exp) => (
						<OrganizerBookingExperienceCard
							key={exp.id}
							experience={exp}
							onUpdateStatus={runAction}
							isActionLoading={actionLoading}
							pendingActionId={pendingActionId}
						/>
					))}
				</div>
			) : (
				<p className="py-12 text-center text-sm text-muted-foreground">No bookings to display.</p>
			)}
		</ConsolePage>
	);
}
