import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import CtaButton from "@/components/ui/cta-button";

interface ConsoleSubPageProps {
	backHref: string;
	backLabel?: string;
	badgeLabel?: string;
	title: string;
	subtitle?: string;
	action?: React.ReactNode;
	children: React.ReactNode;
}

export function ConsoleSubPage({ backHref, backLabel = "Back", badgeLabel, title, subtitle, action, children }: ConsoleSubPageProps) {
	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-2">
				{badgeLabel ? (
					<Badge variant="soft" className="w-fit text-xs">
						{badgeLabel}
					</Badge>
				) : null}
				<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
					<div>
						<h1 className="text-3xl font-semibold text-foreground">{title}</h1>
						{subtitle ? <p className="max-w-3xl text-sm text-muted-foreground">{subtitle}</p> : null}
					</div>
					{action ?? null}
				</div>
			</div>

			<div>{children}</div>
		</div>
	);
}

export default ConsoleSubPage;
