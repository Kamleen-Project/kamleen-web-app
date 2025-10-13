"use client";

import { Check, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export type OrganizerBookingReservation = {
	id: string;
	status: "PENDING" | "CONFIRMED" | "CANCELLED";
	guests: number;
	totalPrice: number;
	createdAt: string;
	explorer: { name: string | null; email: string | null } | null;
};

type OrganizerBookingReservationCardProps = {
	reservation: OrganizerBookingReservation;
	currency: string;
	pendingActionId: string | null;
	isActionLoading: boolean;
	onUpdateStatus: (bookingId: string, nextStatus: "CONFIRMED" | "CANCELLED") => void;
};

export function OrganizerBookingReservationCard({
	reservation,
	currency,
	pendingActionId,
	isActionLoading,
	onUpdateStatus,
}: OrganizerBookingReservationCardProps) {
	const isPending = reservation.status === "PENDING";
	return (
		<li className="rounded-lg border border-border/60 bg-muted/30 p-3">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="space-y-1">
					<p className="text-xs text-muted-foreground">Requested {formatDate24(reservation.createdAt)}</p>
					{reservation.explorer ? (
						<p className="text-xs text-muted-foreground">
							{reservation.explorer.name ?? "Anonymous"} · {reservation.explorer.email ?? "No email"}
						</p>
					) : null}
					<p className="text-xs text-muted-foreground">
						<span className="font-semibold">{reservation.guests}</span> guest{reservation.guests === 1 ? "" : "s"}
					</p>
				</div>
				<div className="flex items-center gap-3">
					<span className="text-sm font-medium text-foreground">{formatCurrency(reservation.totalPrice, currency)}</span>
					<StatusBadge status={reservation.status} />
				</div>
			</div>
			{isPending ? (
				<div className="mt-3 flex flex-wrap items-center gap-2">
					<Button size="sm" onClick={() => onUpdateStatus(reservation.id, "CONFIRMED")} disabled={isActionLoading && pendingActionId === reservation.id}>
						{isActionLoading && pendingActionId === reservation.id ? (
							<span className="inline-flex items-center gap-2">
								<Loader2 className="size-4 animate-spin" /> Confirming…
							</span>
						) : (
							<span className="inline-flex items-center gap-2">
								<Check className="size-4" /> Confirm
							</span>
						)}
					</Button>
					<Button
						size="sm"
						variant="destructive"
						onClick={() => onUpdateStatus(reservation.id, "CANCELLED")}
						disabled={isActionLoading && pendingActionId === reservation.id}
					>
						{isActionLoading && pendingActionId === reservation.id ? (
							<span className="inline-flex items-center gap-2">
								<Loader2 className="size-4 animate-spin" /> Cancelling…
							</span>
						) : (
							<span className="inline-flex items-center gap-2">
								<X className="size-4" /> Cancel
							</span>
						)}
					</Button>
				</div>
			) : null}
		</li>
	);
}

function formatDate24(value: string) {
	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).format(new Date(value));
}

function formatCurrency(value: number, currency: string) {
	return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(value);
}

function StatusBadge({ status }: { status: "PENDING" | "CONFIRMED" | "CANCELLED" }) {
	const statusStyles =
		status === "CONFIRMED" ? "bg-emerald-100 text-emerald-700" : status === "CANCELLED" ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-700";
	return <span className={`inline-flex rounded px-2 py-0.5 text-xs ${statusStyles}`}>{status}</span>;
}
