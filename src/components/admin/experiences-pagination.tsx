"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { TablePagination } from "@/components/ui/table";

export function ExperiencesPagination({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	function applyParams(next: URLSearchParams) {
		const url = `${pathname}?${next.toString()}`;
		router.replace(url);
	}

	function onPageChange(nextPage: number) {
		const next = new URLSearchParams(searchParams?.toString());
		if (nextPage <= 1) next.delete("page");
		else next.set("page", String(nextPage));
		applyParams(next);
	}

	return (
		<TablePagination
			page={page}
			pageSize={pageSize}
			total={total}
			onPageChange={onPageChange}
			// page size selector shown at top filters; not here
		/>
	);
}
