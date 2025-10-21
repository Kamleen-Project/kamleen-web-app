import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Container } from "./container";

interface ContentPageProps {
	caption?: string;
	title: string;
	subtitle?: string;
	children: ReactNode;
	className?: string;
	contentClassName?: string;
}

export function ContentPage({
	caption,
	title,
	subtitle,
	children,
	className,
	contentClassName,
}: ContentPageProps) {
	return (
		<Container className={cn("flex flex-col gap-12 py-16 lg:gap-16 lg:py-24", className)}>
			<header className="max-w-3xl space-y-4">
				{caption ? (
					<p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
						{caption}
					</p>
				) : null}
				<h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
					{title}
				</h1>
				{subtitle ? <p className="text-base text-muted-foreground sm:text-lg">{subtitle}</p> : null}
			</header>
			<section className={cn("max-w-5xl text-sm leading-relaxed text-muted-foreground sm:text-base", contentClassName)}>
				{children}
			</section>
		</Container>
	);
}
