import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn(
			"group relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card p-6 shadow-sm transition hover:shadow-md",
			className
		)}
		{...props}
	/>
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
	<div ref={ref} className={cn("mb-4 flex flex-col gap-2", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
	<div ref={ref} className={cn("flex flex-1 flex-col gap-2", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
	<p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
	<h3 ref={ref} className={cn("text-lg font-semibold text-foreground", className)} {...props} />
));
CardTitle.displayName = "CardTitle";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
	<div ref={ref} className={cn("mt-4 flex items-center justify-between", className)} {...props} />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardContent, CardDescription, CardFooter, CardTitle };
