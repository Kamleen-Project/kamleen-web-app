"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import CtaIconButton from "../ui/cta-icon-button";
import { SelectField } from "@/components/ui/select-field";
import { InputField } from "@/components/ui/input-field";

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
				<SelectField
					aria-label="Role filter"
					value={role}
					onChange={(e) => onChangeRole(e.target.value)}
					className="h-9"
					containerClassName="w-[160px]"
					options={[
						{ value: "__ALL__", label: "All roles" },
						{ value: "EXPLORER", label: "Explorer" },
						{ value: "ORGANIZER", label: "Organizer" },
					]}
				/>
				<SelectField
					aria-label="Organizer request filter"
					value={organizer}
					onChange={(e) => onChangeOrganizer(e.target.value)}
					className="h-9"
					containerClassName="w-[200px]"
					options={[
						{ value: "__ALL__", label: "All organizer requests" },
						{ value: "NOT_APPLIED", label: "Not applied" },
						{ value: "PENDING", label: "Pending" },
						{ value: "APPROVED", label: "Approved" },
						{ value: "REJECTED", label: "Rejected" },
					]}
				/>
				{role !== "__ALL__" || organizer !== "__ALL__" || (q ?? "").trim().length > 0 ? (
					<CtaIconButton color="whiteBorder" size="md" ariaLabel="Reset filters" onClick={onReset}>
						<X />
					</CtaIconButton>
				) : null}
			</div>
			<div className="ml-auto flex items-center gap-2">
				<div className="relative">
					<Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<InputField
						type="search"
						aria-label="Search users"
						placeholder="Search name or email..."
						value={q}
						onChange={(e) => setQ(e.target.value)}
						className="pl-8 h-9 w-64"
					/>
				</div>
			</div>
		</div>
	);
}

export default UsersFilters;
