"use client";

import { Info } from "lucide-react";
import { CtaIconButton } from "@/components/ui/cta-icon-button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { CtaButton } from "@/components/ui/cta-button";

type PaymentDetails = {
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
};

export function PaymentInfoButton({ payment }: { payment: PaymentDetails }) {
	function formatAmount(amount?: number | null, currency?: string | null): string {
		if (typeof amount !== "number" || !currency) return "-";
		return `${(amount / 100).toFixed(2)} ${currency}`;
	}

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

	return (
		<Dialog>
			<DialogTrigger asChild>
				<CtaIconButton size="sm" color="whiteBorder" ariaLabel="View payment details">
					<Info />
				</CtaIconButton>
			</DialogTrigger>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Payment details</DialogTitle>
				</DialogHeader>
				<div className="space-y-2 text-sm">
					<div className="flex items-center justify-between">
						<p className="text-muted-foreground">Provider</p>
						<p className="font-medium">{payment.provider}</p>
					</div>
					{payment.providerPaymentId ? (
						<div className="flex items-center justify-between">
							<p className="text-muted-foreground">Provider ID</p>
							<p className="font-mono">{payment.providerPaymentId}</p>
						</div>
					) : null}
					<div className="flex items-center justify-between">
						<p className="text-muted-foreground">Status</p>
						<p className="font-medium">{payment.status}</p>
					</div>
					<div className="flex items-center justify-between">
						<p className="text-muted-foreground">Amount</p>
						<p className="font-medium">{formatAmount(payment.amount ?? null, payment.currency ?? null)}</p>
					</div>
					<div className="flex items-center justify-between">
						<p className="text-muted-foreground">Created</p>
						<p className="font-medium">{formatDate(payment.createdAt ?? null)}</p>
					</div>
					<div className="flex items-center justify-between">
						<p className="text-muted-foreground">Captured</p>
						<p className="font-medium">{formatDate(payment.capturedAt ?? null)}</p>
					</div>
					{payment.refundedAt ? (
						<div className="flex items-center justify-between">
							<p className="text-muted-foreground">Refunded</p>
							<p className="font-medium">
								{formatDate(payment.refundedAt)} {typeof payment.refundedAmount === "number" ? `• ${(payment.refundedAmount / 100).toFixed(2)} ${payment.currency ?? ""}` : ""}
							</p>
						</div>
					) : null}
					{payment.receiptUrl ? (
						<div className="flex items-center justify-between">
							<p className="text-muted-foreground">Receipt</p>
							<a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="font-medium text-foreground underline">
								View receipt
							</a>
						</div>
					) : null}
					{payment.errorMessage || payment.errorCode ? (
						<div className="rounded-md border border-border/60 p-2">
							<p className="text-xs text-muted-foreground">Last error</p>
							<p className="text-xs">
								{payment.errorCode ? <span className="font-medium">{payment.errorCode}: </span> : null}
								{payment.errorMessage}
							</p>
						</div>
					) : null}
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

export default PaymentInfoButton;


