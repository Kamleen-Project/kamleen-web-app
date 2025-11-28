"use client";

import { Minus, Plus } from "lucide-react";
import CtaIconButton from "./cta-icon-button";

type StepperProps = {
	value: string;
	onChange: (value: string) => void;
	min?: number;
	max?: number;
	step?: number;
	className?: string;
};

export function Stepper({ value, onChange, min = 0, max = 100, step = 1, className = "" }: StepperProps) {
	function parseAndClamp(raw: string): string {
		const digits = raw.replace(/\D+/g, "");
		if (!digits) return "";
		let num = Number.parseInt(digits, 10);
		num = Math.max(min, Math.min(max, num));
		return String(num);
	}

	function adjust(delta: number) {
		const current = Number.parseInt(value || "0", 10) || 0;
		const next = Math.max(min, Math.min(max, current + delta * step));
		onChange(String(next));
	}

	return (
		<div className={`flex items-center gap-2 ${className}`}>
			<CtaIconButton
				size="sm"
				onClick={() => adjust(-1)}
				aria-label="Decrease"
			>
				<Minus className="h-2 w-2" />
			</CtaIconButton>
			<input
				className="h-11 w-11 shrink-0 rounded-md border-none bg-background text-center text-sm font-bold outline-none"
				inputMode="numeric"
				pattern="[0-9]*"
				value={value}
				onKeyDown={(e) => {
					const blocked = ["e", "E", "+", "-", ".", ","];
					if (blocked.includes(e.key)) e.preventDefault();
				}}
				onChange={(e) => onChange(parseAndClamp(e.target.value))}
				onBlur={(e) => onChange(parseAndClamp(e.target.value || String(min)))}
			/>
			<CtaIconButton
				size="sm"
				onClick={() => adjust(1)}
				aria-label="Increase"
			>
				<Plus className="h-2 w-2" />
			</CtaIconButton>
		</div>
	);
}

export default Stepper;
