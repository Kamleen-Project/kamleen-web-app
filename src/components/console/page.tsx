"use client";
interface ConsolePageProps {
	title: string;
	subtitle?: string;
	action?: React.ReactNode;
	children: React.ReactNode;
}

export function ConsolePage({ title, subtitle, action, children }: ConsolePageProps) {
	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="space-y-1">
					<h2 className="text-2xl font-semibold text-foreground">{title}</h2>
					{subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
				</div>
				{action ?? null}
			</div>

			<div>{children}</div>
		</div>
	);
}

export default ConsolePage;
