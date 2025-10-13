"use client";

import { cn } from "@/lib/utils";

type ConsoleSectionProps = {
	title?: string;
	subtitle?: string;
	action?: React.ReactNode;
	children: React.ReactNode;
	className?: string;
	headerClassName?: string;
	contentClassName?: string;
};

export function ConsoleSection({ title, subtitle, action, children, className, headerClassName, contentClassName }: ConsoleSectionProps) {
	return (
		<section className={cn("grid gap-6 rounded-lg border border-border/40 bg-white p-6 shadow-sm", className)}>
			{title || subtitle || action ? (
				<div className={cn("flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between", headerClassName)}>
					<div className="space-y-1">
						{title ? <h3 className="text-base font-semibold text-foreground">{title}</h3> : null}
						{subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
					</div>
					{action ?? null}
				</div>
			) : null}

			<div className={contentClassName}>{children}</div>
		</section>
	);
}

export default ConsoleSection;
