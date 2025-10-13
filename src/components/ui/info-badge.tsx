import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface InfoBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
	icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
	variant?: "default" | "outline" | "soft";
	uppercase?: boolean;
	value?: React.ReactNode;
	suffix?: React.ReactNode;
}

export function InfoBadge({ icon: Icon, variant = "outline", uppercase = true, value, suffix, className, children, ...props }: InfoBadgeProps) {
	return (
		<Badge variant={variant} className={cn("gap-1", uppercase ? undefined : "normal-case", className)} {...props}>
			{Icon ? <Icon className="size-3" /> : null}
			{children != null ? <span>{children}</span> : null}
			{value != null ? <span className="text-sm font-semibold text-foreground">{value}</span> : null}
			{suffix ? <span className="text-xs text-muted-foreground">{suffix}</span> : null}
		</Badge>
	);
}
