import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
	return (
		<textarea
			ref={ref}
			className={cn(
				"block w-full rounded-md border border-input bg-background px-4 py-3 text-sm shadow-sm transition focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
				className
			)}
			{...props}
		/>
	);
});
Textarea.displayName = "Textarea";

export { Textarea };
