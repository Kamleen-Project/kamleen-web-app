"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import CtaIconButton from "../ui/cta-icon-button";

export type KpiMetric = {
	label: string;
	value: number | string;
};

type KpiCardProps = {
	title: string;
	description?: string;
	metrics: KpiMetric[];
	href?: string;
	className?: string;
};

const numberFormatter = new Intl.NumberFormat("en-US", {
	maximumFractionDigits: 1,
});

function formatValue(value: number | string) {
	if (typeof value === "number") {
		return numberFormatter.format(value);
	}

	return value;
}

export function KpiCard({ title, description, metrics, href, className }: KpiCardProps) {
	return (
		<Card className={cn("border-border/70 bg-card/95 shadow-sm", className)}>
			<CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
				<div className="space-y-1">
					<p className="text-sm font-semibold text-foreground">{title}</p>
					{description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
				</div>
				{href ? (
					<CtaIconButton color="whiteBorder" size="sm" asChild ariaLabel={`Go to ${title} dashboard`}>
						<Link href={href} className="inline-flex items-center gap-1">
							<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
						</Link>
					</CtaIconButton>
				) : null}
			</CardHeader>
			<CardContent className="space-y-4">
				{metrics.map((metric) => (
					<div key={metric.label} className="flex items-baseline justify-between gap-4">
						<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{metric.label}</span>
						<span className="text-3xl font-semibold text-foreground">{formatValue(metric.value)}</span>
					</div>
				))}
			</CardContent>
		</Card>
	);
}

export default KpiCard;
