"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ExperiencesFilters({
	initialVerification,
	initialStatus,
	initialQuery,
}: {
	initialVerification: string;
	initialStatus: string;
	initialQuery: string | null;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const [verification, setVerification] = React.useState(initialVerification);
	const [status, setStatus] = React.useState(initialStatus);
	const [q, setQ] = React.useState(initialQuery ?? "");

	React.useEffect(() => {
		setVerification(initialVerification);
	}, [initialVerification]);

	React.useEffect(() => {
		setStatus(initialStatus);
	}, [initialStatus]);

	React.useEffect(() => {
		setQ(initialQuery ?? "");
	}, [initialQuery]);

	function applyParams(next: URLSearchParams) {
		const url = `${pathname}?${next.toString()}`;
		router.replace(url);
	}

	function onChangeVerification(value: string) {
		setVerification(value);
		const next = new URLSearchParams(searchParams?.toString());
		if (!value || value === "__ALL__") next.delete("verification");
		else next.set("verification", value);
		applyParams(next);
	}

	function onChangeStatus(value: string) {
		setStatus(value);
		const next = new URLSearchParams(searchParams?.toString());
		if (!value || value === "__ALL__") next.delete("status");
		else next.set("status", value);
		applyParams(next);
	}

	// Debounce search input
	React.useEffect(() => {
		const handle = setTimeout(() => {
			const next = new URLSearchParams(searchParams?.toString());
			const trimmed = q.trim();
			if (trimmed.length === 0) next.delete("q");
			else next.set("q", trimmed);
			applyParams(next);
		}, 300);
		return () => clearTimeout(handle);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [q]);

	function onReset() {
		const next = new URLSearchParams(searchParams?.toString());
		next.delete("verification");
		next.delete("status");
		next.delete("q");
		setVerification("__ALL__");
		setStatus("__ALL__");
		setQ("");
		applyParams(next);
	}

	return (
		<div className="flex w-full items-center gap-2">
			<div className="flex items-center gap-2">
				<select
					aria-label="Verification filter"
					value={verification}
					onChange={(e) => onChangeVerification(e.target.value)}
					className="h-9 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none"
				>
					<option value="__ALL__">All verifications</option>
					<option value="NOT_SUBMITTED">Not submitted</option>
					<option value="PENDING">Pending</option>
					<option value="VERIFIED">Verified</option>
					<option value="REJECTED">Rejected</option>
				</select>
				<select
					aria-label="Publish filter"
					value={status}
					onChange={(e) => onChangeStatus(e.target.value)}
					className="h-9 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none"
				>
					<option value="__ALL__">All publishing</option>
					<option value="DRAFT">Draft</option>
					<option value="PUBLISHED">Published</option>
					<option value="UNPUBLISHED">Unpublished</option>
					<option value="UNLISTED">Unlisted</option>
					<option value="ARCHIVED">Archived</option>
				</select>
				{verification !== "__ALL__" || status !== "__ALL__" || (q ?? "").trim().length > 0 ? (
					<Button type="button" variant="outline" size="icon" aria-label="Reset filters" onClick={onReset}>
						<X />
					</Button>
				) : null}
			</div>
			<div className="ml-auto flex items-center gap-2">
				<div className="relative">
					<Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<input
						type="search"
						aria-label="Search experiences"
						placeholder="Search experiences or organizers..."
						value={q}
						onChange={(e) => setQ(e.target.value)}
						className="h-9 w-64 rounded-md border border-border/60 bg-background pl-8 pr-3 text-sm text-foreground shadow-sm focus:outline-none"
					/>
				</div>
			</div>
		</div>
	);
}
