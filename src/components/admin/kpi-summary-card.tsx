"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type BreakdownItem = {
	label: string;
	value: number;
	colorClass?: string;
};

type KpiSummaryCardProps = {
	title: string;
	description?: string;
	primaryLabel: string;
	primaryValue?: number;
	breakdown: BreakdownItem[];
	className?: string;
};

const numberFormatter = new Intl.NumberFormat("en-US");

function formatCount(value: number) {
	return numberFormatter.format(value);
}

export function KpiSummaryCard({ title, description, primaryLabel, primaryValue, breakdown, className }: KpiSummaryCardProps) {
	const breakdownTotal = breakdown.reduce((sum, item) => sum + item.value, 0);
	const displayTotal = typeof primaryValue === "number" ? primaryValue : breakdownTotal;
	const ratioBase = breakdownTotal > 0 ? breakdownTotal : 1;

	return (
		<Card className={cn("border-border/70 bg-card", className)}>
			<CardHeader className="space-y-3 flex flex-row items-start justify-between">
				<div className="space-y-1.5">
					<p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
					{description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
				</div>
				<div className="flex flex-col items-end">
					<p className="text-4xl font-semibold text-foreground">{formatCount(displayTotal)}</p>
					<p className="text-xs text-muted-foreground">{primaryLabel}</p>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex h-3 overflow-hidden rounded-full bg-muted">
					{breakdown.map((item) => (
						<div
							key={item.label}
							className={cn("h-full transition-all", item.colorClass ?? "bg-primary/70")}
							style={{ width: `${(item.value / ratioBase) * 100}%` }}
						/>
					))}
				</div>

				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
					{breakdown.map((item) => (
						<div key={item.label} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<span className={cn("h-2.5 w-2.5 rounded-full", item.colorClass ?? "bg-primary/70")} />
								<span>{item.label}</span>
							</div>
							<span className="text-sm font-semibold text-foreground">{formatCount(item.value)}</span>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

export default KpiSummaryCard;
