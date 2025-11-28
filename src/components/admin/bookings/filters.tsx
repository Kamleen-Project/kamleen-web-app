"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import CtaIconButton from "@/components/ui/cta-icon-button";
import { SelectField } from "@/components/ui/select-field";
import { InputField } from "@/components/ui/input-field";

export function BookingsFilters({
	initialStatus,
	initialPaymentStatus,
	initialQuery,
	initialPageSize = 10,
}: {
	initialStatus: string;
	initialPaymentStatus: string;
	initialQuery: string | null;
	initialPageSize?: number;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const [status, setStatus] = React.useState(initialStatus);
	const [paymentStatus, setPaymentStatus] = React.useState(initialPaymentStatus);
	const [q, setQ] = React.useState(initialQuery ?? "");
	const [pageSize, setPageSize] = React.useState<number>(initialPageSize);

	React.useEffect(() => {
		setStatus(initialStatus);
	}, [initialStatus]);

	React.useEffect(() => {
		setPaymentStatus(initialPaymentStatus);
	}, [initialPaymentStatus]);

	React.useEffect(() => {
		setQ(initialQuery ?? "");
	}, [initialQuery]);

	React.useEffect(() => {
		setPageSize(initialPageSize ?? 10);
	}, [initialPageSize]);

	function applyParams(next: URLSearchParams) {
		const url = `${pathname}?${next.toString()}`;
		router.replace(url);
	}

	function onChangeStatus(value: string) {
		setStatus(value);
		const next = new URLSearchParams(searchParams?.toString());
		if (!value || value === "__ALL__") next.delete("status");
		else next.set("status", value);
		next.delete("page");
		applyParams(next);
	}

	function onChangePaymentStatus(value: string) {
		setPaymentStatus(value);
		const next = new URLSearchParams(searchParams?.toString());
		if (!value || value === "__ALL__") next.delete("paymentStatus");
		else next.set("paymentStatus", value);
		next.delete("page");
		applyParams(next);
	}

	function onChangePageSize(nextSize: number) {
		const normalized = nextSize <= 10 ? 10 : nextSize <= 20 ? 20 : 50;
		setPageSize(normalized);
		const next = new URLSearchParams(searchParams?.toString());
		if (normalized === 10) next.delete("pageSize");
		else next.set("pageSize", String(normalized));
		next.delete("page");
		applyParams(next);
	}

	// Debounce search input
	React.useEffect(() => {
		const handle = setTimeout(() => {
			const next = new URLSearchParams(searchParams?.toString());
			const trimmed = q.trim();
			if (trimmed.length === 0) next.delete("q");
			else next.set("q", trimmed);
			next.delete("page");
			applyParams(next);
		}, 300);
		return () => clearTimeout(handle);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [q]);

	function onReset() {
		const next = new URLSearchParams(searchParams?.toString());
		next.delete("status");
		next.delete("paymentStatus");
		next.delete("q");
		setStatus("__ALL__");
		setPaymentStatus("__ALL__");
		setQ("");
		next.delete("page");
		next.delete("pageSize");
		applyParams(next);
	}

	return (
		<div className="flex w-full items-center gap-2">
			<div className="flex items-center gap-2">
				<SelectField
					aria-label="Status filter"
					value={status}
					onChange={(e) => onChangeStatus(e.target.value)}
					className="h-9"
					containerClassName="w-[180px]"
					options={[
						{ value: "__ALL__", label: "All statuses" },
						{ value: "PENDING", label: "Pending" },
						{ value: "CONFIRMED", label: "Confirmed" },
						{ value: "CANCELLED", label: "Cancelled" },
					]}
				/>
				<SelectField
					aria-label="Payment status filter"
					value={paymentStatus}
					onChange={(e) => onChangePaymentStatus(e.target.value)}
					className="h-9"
					containerClassName="w-[200px]"
					options={[
						{ value: "__ALL__", label: "All payments" },
						{ value: "REQUIRES_PAYMENT_METHOD", label: "Requires payment method" },
						{ value: "REQUIRES_ACTION", label: "Requires action" },
						{ value: "PROCESSING", label: "Processing" },
						{ value: "SUCCEEDED", label: "Succeeded" },
						{ value: "CANCELLED", label: "Cancelled" },
						{ value: "REFUNDED", label: "Refunded" },
					]}
				/>
				{status !== "__ALL__" || paymentStatus !== "__ALL__" || (q ?? "").trim().length > 0 ? (
					<CtaIconButton color="whiteBorder" size="md" ariaLabel="Reset filters" onClick={onReset}>
						<X />
					</CtaIconButton>
				) : null}
			</div>
			<div className="ml-auto flex items-center gap-3">
				<div className="relative">
					<Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<InputField
						type="search"
						aria-label="Search bookings"
						placeholder="Search bookings, guests, payments..."
						value={q}
						onChange={(e) => setQ(e.target.value)}
						className="pl-8 h-9 w-64"
					/>
				</div>
				<SelectField
					aria-label="Results per page"
					value={String(pageSize)}
					onChange={(e) => onChangePageSize(Number.parseInt(e.target.value, 10) || pageSize)}
					className="h-9"
					containerClassName="w-[120px]"
					options={[
						{ value: "10", label: "10" },
						{ value: "20", label: "20" },
						{ value: "50", label: "50" },
					]}
				/>
			</div>
		</div>
	);
}


