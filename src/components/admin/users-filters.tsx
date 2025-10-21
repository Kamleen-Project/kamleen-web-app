"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export function UsersFilters({ initialRole, initialOrganizer, initialQuery }: { initialRole: string; initialOrganizer: string; initialQuery: string | null }) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const [role, setRole] = React.useState(initialRole);
	const [organizer, setOrganizer] = React.useState(initialOrganizer);
	const [q, setQ] = React.useState(initialQuery ?? "");

	React.useEffect(() => {
		setRole(initialRole);
	}, [initialRole]);

	React.useEffect(() => {
		setOrganizer(initialOrganizer);
	}, [initialOrganizer]);

	React.useEffect(() => {
		setQ(initialQuery ?? "");
	}, [initialQuery]);

	function applyParams(next: URLSearchParams) {
		const url = `${pathname}?${next.toString()}`;
		router.replace(url);
	}

	function onChangeRole(value: string) {
		setRole(value);
		const next = new URLSearchParams(searchParams?.toString());
		if (!value || value === "__ALL__") next.delete("role");
		else next.set("role", value);
		applyParams(next);
	}

	function onChangeOrganizer(value: string) {
		setOrganizer(value);
		const next = new URLSearchParams(searchParams?.toString());
		if (!value || value === "__ALL__") next.delete("organizer");
		else next.set("organizer", value);
		applyParams(next);
	}

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
		next.delete("role");
		next.delete("organizer");
		next.delete("q");
		setRole("__ALL__");
		setOrganizer("__ALL__");
		setQ("");
		applyParams(next);
	}

	return (
		<div className="flex w-full items-center gap-2">
			<div className="flex items-center gap-2">
				<select
					aria-label="Role filter"
					value={role}
					onChange={(e) => onChangeRole(e.target.value)}
					className="h-9 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none"
				>
					<option value="__ALL__">All roles</option>
					<option value="EXPLORER">Explorer</option>
					<option value="ORGANIZER">Organizer</option>
				</select>
				<select
					aria-label="Organizer request filter"
					value={organizer}
					onChange={(e) => onChangeOrganizer(e.target.value)}
					className="h-9 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none"
				>
					<option value="__ALL__">All organizer requests</option>
					<option value="NOT_APPLIED">Not applied</option>
					<option value="PENDING">Pending</option>
					<option value="APPROVED">Approved</option>
					<option value="REJECTED">Rejected</option>
				</select>
				{role !== "__ALL__" || organizer !== "__ALL__" || (q ?? "").trim().length > 0 ? (
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
						aria-label="Search users"
						placeholder="Search name or email..."
						value={q}
						onChange={(e) => setQ(e.target.value)}
						className="h-9 w-64 rounded-md border border-border/60 bg-background pl-8 pr-3 text-sm text-foreground shadow-sm focus:outline-none"
					/>
				</div>
			</div>
		</div>
	);
}

export default UsersFilters;
