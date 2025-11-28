"use client";

import { Info } from "lucide-react";
import { CtaIconButton } from "@/components/ui/cta-icon-button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { CtaButton } from "@/components/ui/cta-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { CopyButton } from "@/components/ui/copy-button";

type Organizer = {
	name: string | null;
	email: string | null;
};

type Experience = {
	title: string;
	currency: string;
	organizer?: Organizer | null;
};

type Session = {
	startAt?: string | Date | null;
	duration?: string | null;
	locationLabel?: string | null;
	meetingAddress?: string | null;
};

type Explorer = {
	name: string | null;
	email: string | null;
};

type Payment = {
	id: string;
	provider: string;
	providerPaymentId?: string | null;
	status: string;
	amount?: number | null;
	currency?: string | null;
	receiptUrl?: string | null;
	errorCode?: string | null;
	errorMessage?: string | null;
	createdAt?: string | Date | null;
	capturedAt?: string | Date | null;
	refundedAt?: string | Date | null;
	refundedAmount?: number | null;
} | null;

type Booking = {
	id: string;
	status: string;
	paymentStatus?: string | null;
	guests: number;
	totalPrice: number;
	experience: Experience;
	session?: Session | null;
	explorer: Explorer;
	payment?: Payment;
	createdAt?: string | Date | null;
};

function formatDate(value?: string | Date | null): string {
	if (!value) return "-";
	const d = typeof value === "string" ? new Date(value) : value;
	try {
		return d.toLocaleString("en-GB", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
		});
	} catch {
		return String(d);
	}
}

function formatAmountInMinorUnits(amount: number | null | undefined, currency: string | null | undefined): string {
	if (typeof amount !== "number" || !currency) return "-";
	return `${(amount / 100).toFixed(2)} ${currency}`;
}

function formatMajorUnits(amount: number | null | undefined, currency: string | null | undefined): string {
	if (typeof amount !== "number" || !currency) return "-";
	return `${amount.toFixed(2)} ${currency}`;
}

function mapBookingVariation(value: string): "success" | "warning" | "danger" | "muted" | "outline" | "soft" {
	if (value === "CONFIRMED" || value === "COMPLETED") return "success";
	if (value === "PENDING" || value === "PROCESSING") return "warning";
	if (value === "CANCELLED" || value === "CANCELED" || value === "REJECTED") return "danger";
	if (value === "EXPIRED") return "muted";
	return "outline";
}

function mapPaymentVariation(value: string): "success" | "warning" | "danger" | "muted" | "outline" {
	if (value === "SUCCEEDED" || value === "COMPLETED" || value === "PAID") return "success";
	if (value === "PENDING" || value === "PROCESSING" || value === "REQUIRES_ACTION") return "warning";
	if (value === "FAILED" || value === "CANCELED" || value === "CANCELLED" || value === "REFUNDED") return "danger";
	return "outline";
}

export function BookingInfoButton({ booking }: { booking: Booking }) {
	const payment = booking.payment ?? null;
	const experience = booking.experience;
	const session = booking.session ?? null;
	const explorer = booking.explorer;
	const organizer = experience.organizer ?? null;

	return (
		<Dialog>
			<DialogTrigger asChild>
				<CtaIconButton size="sm" color="whiteBorder" ariaLabel="View booking details">
					<Info />
				</CtaIconButton>
			</DialogTrigger>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Booking details</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					{/* Experience & Session & People */}
					<div className="rounded-lg border border-border/60 p-3">
						<p className="text-sm font-semibold text-foreground">Experience & session</p>
						<div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
							<div className="flex items-center justify-between">
								<p className="text-muted-foreground">Experience</p>
								<p className="font-medium">{experience.title}</p>
							</div>
							<div className="flex items-center justify-between">
								<p className="text-muted-foreground">Session start</p>
								<p className="font-medium">{formatDate(session?.startAt ?? null)}</p>
							</div>
							{session?.duration ? (
								<div className="flex items-center justify-between">
									<p className="text-muted-foreground">Duration</p>
									<p className="font-medium">{session.duration}</p>
								</div>
							) : null}
							{session?.locationLabel ? (
								<div className="flex items-center justify-between">
									<p className="text-muted-foreground">Location</p>
									<p className="font-medium">{session.locationLabel}</p>
								</div>
							) : null}
							{session?.meetingAddress ? (
								<div className="flex items-center justify-between sm:col-span-2">
									<p className="text-muted-foreground">Meeting address</p>
									<p className="font-medium">{session.meetingAddress}</p>
								</div>
							) : null}
						</div>
						<div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
							<div className="rounded-md border border-border/60 p-2">
								<p className="text-xs text-muted-foreground mb-1">Organizer</p>
								<p className="text-sm">{organizer?.name ?? organizer?.email ?? "Unknown"}</p>
								{organizer?.email ? <p className="text-xs text-muted-foreground">{organizer.email}</p> : null}
							</div>
							<div className="rounded-md border border-border/60 p-2">
								<p className="text-xs text-muted-foreground mb-1">Guest</p>
								<p className="text-sm">{explorer?.name ?? explorer?.email ?? "Unknown"}</p>
								{explorer?.email ? <p className="text-xs text-muted-foreground">{explorer.email}</p> : null}
							</div>
						</div>
					</div>

					{/* Booking */}
					<div className="rounded-lg border border-border/60 p-3">
						<p className="text-sm font-semibold text-foreground">Booking</p>
						<div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
							<div className="flex items-center justify-between">
								<p className="text-muted-foreground">Booking ID</p>
								<div className="flex items-center gap-1.5">
									<p className="font-mono text-xs">{booking.id}</p>
									<CopyButton text={booking.id} ariaLabel="Copy booking id" />
								</div>
							</div>
							<div className="flex items-center justify-between">
								<p className="text-muted-foreground">Status</p>
								<div className="flex items-center">
									<StatusBadge value={booking.status} variation={mapBookingVariation(booking.status)} />
								</div>
							</div>
							<div className="flex items-center justify-between">
								<p className="text-muted-foreground">Spots reserved</p>
								<p className="font-medium">{booking.guests}</p>
							</div>
							<div className="flex items-center justify-between">
								<p className="text-muted-foreground">Total</p>
								<p className="font-medium">{formatMajorUnits(booking.totalPrice, experience.currency)}</p>
							</div>
							{typeof booking.createdAt !== "undefined" ? (
								<div className="flex items-center justify-between sm:col-span-2">
									<p className="text-muted-foreground">Created</p>
									<p className="font-medium">{formatDate(booking.createdAt ?? null)}</p>
								</div>
							) : null}
						</div>
					</div>

					{/* Payment */}
					<div className="rounded-lg border border-border/60 p-3">
						<p className="text-sm font-semibold text-foreground">Payment</p>
						{payment ? (
							<div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
								<div className="flex items-center justify-between">
									<p className="text-muted-foreground">Provider</p>
									<p className="font-medium">{payment.provider}</p>
								</div>
								<div className="flex items-center justify-between">
									<p className="text-muted-foreground">Status</p>
									<div className="flex items-center">
										<StatusBadge value={payment.status} variation={mapPaymentVariation(payment.status)} />
									</div>
								</div>
								<div className="flex items-center justify-between">
									<p className="text-muted-foreground">Amount</p>
									<p className="font-medium">{formatAmountInMinorUnits(payment.amount ?? null, payment.currency ?? null)}</p>
								</div>
								{payment.providerPaymentId ? (
									<div className="flex items-center justify-between">
										<p className="text-muted-foreground">Provider ID</p>
										<p className="font-mono">{payment.providerPaymentId}</p>
									</div>
								) : null}
								<div className="flex items-center justify-between">
									<p className="text-muted-foreground">Created</p>
									<p className="font-medium">{formatDate(payment.createdAt ?? null)}</p>
								</div>
								<div className="flex items-center justify-between">
									<p className="text-muted-foreground">Captured</p>
									<p className="font-medium">{formatDate(payment.capturedAt ?? null)}</p>
								</div>
								{payment.receiptUrl ? (
									<div className="flex items-center justify-between sm:col-span-2">
										<p className="text-muted-foreground">Receipt</p>
										<a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="font-medium text-foreground underline">
											View receipt
										</a>
									</div>
								) : null}
								{payment.refundedAt ? (
									<div className="flex items-center justify-between sm:col-span-2">
										<p className="text-muted-foreground">Refund</p>
										<p className="font-medium">
											{formatDate(payment.refundedAt)}{" "}
											{typeof payment.refundedAmount === "number" ? `• ${(payment.refundedAmount / 100).toFixed(2)} ${payment.currency ?? ""}` : ""}
										</p>
									</div>
								) : null}
								{payment.errorMessage || payment.errorCode ? (
									<div className="sm:col-span-2 rounded-md border border-border/60 p-2">
										<p className="text-xs text-muted-foreground">Last error</p>
										<p className="text-xs">
											{payment.errorCode ? <span className="font-medium">{payment.errorCode}: </span> : null}
											{payment.errorMessage}
										</p>
									</div>
								) : null}
							</div>
						) : (
							<p className="mt-2 text-sm text-muted-foreground">No payment found.</p>
						)}
					</div>
				</div>
				<DialogFooter className="justify-end">
					<DialogClose asChild>
						<CtaButton color="whiteBorder" size="md" label="Close" />
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default BookingInfoButton;


