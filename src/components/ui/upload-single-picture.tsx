"use client";

import Image from "next/image";
import { useId, useRef } from "react";
import { RefreshCcw, Trash } from "lucide-react";

type AspectMode = "square" | "threeFour" | "fullWidth" | "twentyOneNine" | "twentyOneSix";

export type UploadSinglePictureProps = {
	// Current image preview URL (object URL or remote URL)
	previewUrl?: string | null;
	// Called when a new file is selected
	onChangeFile: (file: File) => void;
	// Called when remove is clicked
	onRemove?: () => void;
	// Visual label texts
	uploadLabel?: string;
	// Supported aspect modes: square (1/1), threeFour (3/4 height), fullWidth (free ratio, fills container)
	aspect?: AspectMode;
	// Optional background image (defaults to pattern)
	backgroundImageUrl?: string;
	// Optional background pattern tint color and opacity (mask based, like onboarding)
	backgroundPatternColor?: string; // e.g. "#000000"
	backgroundPatternOpacity?: number; // 0..1
	backgroundPatternSize?: string; // e.g. "560px" (consistent scale)
	// Optional unique id base (useful when multiple instances exist on screen)
	id?: string;
	// Optional form field name so this input participates in form submission
	name?: string;
	// Optional className for container
	className?: string;
	// Optional loading overlay
	loading?: boolean;
};

export function UploadSinglePicture({
	previewUrl,
	onChangeFile,
	onRemove,
	uploadLabel = "Upload image",
	aspect = "square",
	backgroundImageUrl,
	backgroundPatternColor,
	backgroundPatternOpacity,
	backgroundPatternSize,
	id,
	name,
	className = "",
	loading = false,
}: UploadSinglePictureProps) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const generatedId = useId();
	const inputId = id ?? generatedId;

	function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (file) {
			onChangeFile(file);
			event.currentTarget.value = "";
		}
	}

	const containerClasses = (() => {
		// Ensure fixed container sizing driven by aspect
		if (aspect === "square") return "relative overflow-hidden rounded-lg border border-border/60 w-44 h-44";
		if (aspect === "threeFour") return "relative overflow-hidden rounded-lg border border-border/60 w-full aspect-[3/4]"; // 160x200 roughly 4:5 visual, close to 3:4
		if (aspect === "twentyOneNine") return "relative overflow-hidden rounded-lg border border-border/60 w-full aspect-[21/9]";
		if (aspect === "twentyOneSix") return "relative overflow-hidden rounded-lg border border-border/60 w-full aspect-[21/6]";
		return "relative overflow-hidden rounded-lg border border-border/60 w-full h-48"; // full width save ratio in a fixed height holder
	})();

	const bgUrl = backgroundImageUrl ?? "/images/pattern-svg.svg";
	const backgroundPatternStyle = {
		WebkitMaskImage: `url('${bgUrl}')`,
		maskImage: `url('${bgUrl}')`,
		WebkitMaskRepeat: "repeat",
		maskRepeat: "repeat",
		WebkitMaskSize: backgroundPatternSize ?? "800px",
		maskSize: backgroundPatternSize ?? "800px",
		backgroundColor: backgroundPatternColor ?? "#000000",
		opacity: typeof backgroundPatternOpacity === "number" ? backgroundPatternOpacity : 0.24,
	} as const;

	return (
		<div className={`${containerClasses} ${className}`}>
			<div aria-hidden className="absolute inset-0 rounded-lg pointer-events-none" style={backgroundPatternStyle} />
			<input ref={inputRef} id={inputId} name={name} type="file" accept="image/*" className="hidden" onChange={handleInputChange} />
			{previewUrl ? (
				<>
					<Image src={previewUrl} alt="Selected image" fill unoptimized sizes="200px" className="object-cover" />
					{loading ? (
						<div className="absolute inset-0 flex items-center justify-center bg-black/40">
							<div className="h-8 w-8 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
						</div>
					) : null}
					<div className="absolute inset-2 flex items-start justify-end gap-2">
						{onRemove ? (
							<button
								type="button"
								className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/70"
								onClick={() => {
									// Clear the file input value so form submission does not send previous file
									if (inputRef.current) {
										inputRef.current.value = "";
									}
									onRemove();
								}}
								aria-label="Delete image"
							>
								<Trash className="h-4 w-4" />
							</button>
						) : null}
						<button
							type="button"
							className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-white hover:bg-black/70"
							onClick={() => inputRef.current?.click()}
							aria-label="Replace image"
						>
							<RefreshCcw className="h-4 w-4" />
						</button>
					</div>
				</>
			) : (
				<label
					htmlFor={inputId}
					className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 bg-background/50 text-center hover:bg-primary/5"
				>
					<span className="text-sm font-medium text-foreground">{uploadLabel}</span>
					<span className="text-xs text-muted-foreground">PNG/JPG/WebP</span>
				</label>
			)}
		</div>
	);
}

export default UploadSinglePicture;
