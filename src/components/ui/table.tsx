import * as React from "react";

import { cn } from "@/lib/utils";
import { CtaButton } from "@/components/ui/cta-button";
import { FormSelect } from "@/components/ui/form";

type Align = "left" | "center" | "right";

export function TableContainer({ children, className }: { children: React.ReactNode; className?: string }) {
	return (
		<div className={cn("overflow-hidden rounded-xl border border-border/60 bg-card/80", className)}>
			<div className="overflow-x-auto">{children}</div>
		</div>
	);
}

export function Table({ className, minWidth, children }: { className?: string; minWidth?: number | string; children: React.ReactNode }) {
	const minWidthStyle = typeof minWidth === "number" ? `${minWidth}px` : minWidth;
	return (
		<table className={cn("w-full text-sm", className)} style={minWidth ? { minWidth: minWidthStyle } : undefined}>
			{children}
		</table>
	);
}

export function TableHeader({ children, className }: { children: React.ReactNode; className?: string }) {
	return <thead className={cn(className)}>{children}</thead>;
}

export function TableHeaderRow({ children, className }: { children: React.ReactNode; className?: string }) {
	return <tr className={cn("border-b border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground", className)}>{children}</tr>;
}

export function TableBody({ children, className }: { children: React.ReactNode; className?: string }) {
	return <tbody className={cn(className)}>{children}</tbody>;
}

export function TableRow({ children, className }: { children: React.ReactNode; className?: string }) {
	return <tr className={cn("border-b border-border/50 hover:bg-muted/30", className)}>{children}</tr>;
}

export function TableHead({
	children,
	className,
	align = "left",
	scope = "col" as const,
}: {
	children: React.ReactNode;
	className?: string;
	align?: Align;
	scope?: "col" | "row";
}) {
	const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
	return (
		<th scope={scope} className={cn("px-4 py-3 font-medium", alignClass, className)}>
			{children}
		</th>
	);
}

export function TableCell({ children, className, align = "left" }: { children: React.ReactNode; className?: string; align?: Align }) {
	const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
	return <td className={cn("px-4 py-3", alignClass, className)}>{children}</td>;
}

export function TableCaption({ children, className }: { children: React.ReactNode; className?: string }) {
	return <caption className={cn("text-xs text-muted-foreground caption-bottom", className)}>{children}</caption>;
}

export function TableFooter({ children, className }: { children: React.ReactNode; className?: string }) {
	return <tfoot className={cn(className)}>{children}</tfoot>;
}

export function TableEmpty({ colSpan, children, className }: { colSpan: number; children: React.ReactNode; className?: string }) {
	return (
		<tr>
			<td colSpan={colSpan} className={cn("px-4 py-10 text-center text-muted-foreground", className)}>
				{children}
			</td>
		</tr>
	);
}

export function TableLoading({ colSpan, label = "Loading…", className }: { colSpan: number; label?: string; className?: string }) {
	return (
		<tr>
			<td colSpan={colSpan} className={cn("px-4 py-10 text-center text-muted-foreground", className)}>
				{label}
			</td>
		</tr>
	);
}

export function TablePagination({
	page,
	pageSize,
	total,
	onPageChange,
	onPageSizeChange,
	pageSizeOptions = [10, 25, 50],
	className,
}: {
	page: number;
	pageSize: number;
	total: number;
	onPageChange: (nextPage: number) => void;
	onPageSizeChange?: (nextSize: number) => void;
	pageSizeOptions?: number[];
	className?: string;
}) {
	const pageCount = Math.max(1, Math.ceil((total || 0) / Math.max(1, pageSize || 1)));
	const current = Math.min(Math.max(1, page || 1), pageCount);
	const start = total === 0 ? 0 : (current - 1) * pageSize + 1;
	const end = total === 0 ? 0 : Math.min(total, current * pageSize);

	const canPrev = current > 1;
	const canNext = current < pageCount;

	return (
		<div className={cn("flex w-full items-center justify-between gap-3 px-2 py-3", className)}>
			<div className="text-xs text-muted-foreground">{`Showing ${start}–${end} of ${total}`}</div>
			<div className="flex items-center gap-2">
				{onPageSizeChange ? (
					<div className="flex items-center gap-2">
						<span className="text-xs text-muted-foreground">Rows per page</span>
						<FormSelect value={String(pageSize)} onChange={(e) => onPageSizeChange?.(Number.parseInt(e.target.value, 10) || pageSize)} className="h-8 w-[84px]">
							{pageSizeOptions.map((opt) => (
								<option key={opt} value={opt}>
									{opt}
								</option>
							))}
						</FormSelect>
					</div>
				) : null}
				<div className="flex items-center gap-1">
					<CtaButton color="whiteBorder" size="md" type="button" onClick={() => canPrev && onPageChange(current - 1)} disabled={!canPrev}>
						Prev
					</CtaButton>
					<div className="px-2 text-xs text-muted-foreground">{`${current} / ${pageCount}`}</div>
					<CtaButton color="whiteBorder" size="md" type="button" onClick={() => canNext && onPageChange(current + 1)} disabled={!canNext}>
						Next
					</CtaButton>
				</div>
			</div>
		</div>
	);
}
