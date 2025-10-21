import * as React from "react";

import { cn } from "@/lib/utils";

interface AdminTableProps {
	minWidth?: number | string;
	header: React.ReactNode;
	children: React.ReactNode;
	className?: string;
	tableClassName?: string;
}

export function AdminTable({ minWidth = 900, header, children, className, tableClassName }: AdminTableProps) {
	const minWidthStyle = typeof minWidth === "number" ? `${minWidth}px` : String(minWidth);

	return (
		<div className={cn("overflow-hidden rounded-xl border border-border/60 bg-card/80", className)}>
			<div className="overflow-x-auto">
				<table className={cn("w-full text-sm", tableClassName)} style={{ minWidth: minWidthStyle }}>
					<thead>
						<tr className="border-b border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">{header}</tr>
					</thead>
					<tbody>{children}</tbody>
				</table>
			</div>
		</div>
	);
}

export default AdminTable;
