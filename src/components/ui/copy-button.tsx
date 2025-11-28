"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";
import { CtaIconButton } from "@/components/ui/cta-icon-button";

type CopyButtonProps = {
	text: string;
	ariaLabel?: string;
	size?: "sm" | "md" | "lg";
	color?: "black" | "white" | "whiteBorder" | "red";
	className?: string;
};

export function CopyButton({ text, ariaLabel = "Copy", size = "sm", color = "white", className }: CopyButtonProps) {
	const [copied, setCopied] = React.useState(false);

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1200);
		} catch {
			// no-op
		}
	}

	return (
		<CtaIconButton size={size} color={color} onClick={handleCopy} ariaLabel={ariaLabel} className={className}>
			{copied ? <Check /> : <Copy />}
		</CtaIconButton>
	);
}

export default CopyButton;





