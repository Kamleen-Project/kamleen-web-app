"use client";

import Image from "next/image";
import { useRef } from "react";
import { processImageFile, type ImageProcessOptions } from "@/lib/image-process";
import { Trash } from "lucide-react";
import { CtaIconButton } from "./cta-icon-button";

type AspectMode = "square" | "threeFour" | "fullWidth" | "twentyOneNine" | "twentyOneSix" | "twentyFourFour";

export type UploadMultiplePicturesItem = {
	id: string;
	previewUrl: string;
	loading?: boolean;
};

export type UploadMultiplePicturesProps = {
	selected: UploadMultiplePicturesItem[];
	onAddFiles: (files: File[]) => void;
	onRemove?: (id: string) => void;
	uploadLabel?: string;
	max?: number;
	aspect?: AspectMode;
	fieldAspect?: AspectMode;
	previewAspect?: AspectMode;
	previewColumns?: number;
	backgroundImageUrl?: string;
	backgroundPatternColor?: string; // e.g. "#000000"
	backgroundPatternOpacity?: number; // 0..1
	backgroundPatternSize?: string; // e.g. "560px" (consistent scale)
	id?: string;
	className?: string;
	gridClassName?: string;
	// Enable client-side compression before emitting files (default: true)
	compress?: boolean;
	// Optional compression options override
	compressOptions?: ImageProcessOptions;
};

export function UploadMultiplePictures({
	selected,
	onAddFiles,
	onRemove,
	uploadLabel = "Add photos",
	max,
	aspect = "threeFour",
	fieldAspect,
	previewAspect,
	previewColumns,
	backgroundImageUrl,
	backgroundPatternColor,
	backgroundPatternOpacity,
	backgroundPatternSize,
	id,
	className = "",
	gridClassName = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
	compress = true,
	compressOptions,
}: UploadMultiplePicturesProps) {
	const inputRef = useRef<HTMLInputElement | null>(null);

	async function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
		const files = Array.from(event.target.files ?? []);
		if (files.length) {
			let toSend = files;
			if (compress) {
				const defaults = deriveMultipleDefaults(previewAspect ?? aspect);
				try {
					toSend = await Promise.all(
						files.map(async (f) => {
							try {
								return await processImageFile(f, { ...defaults, ...(compressOptions ?? {}) });
							} catch {
								return f;
							}
						})
					);
				} catch {
					toSend = files;
				}
			}
			onAddFiles(toSend);
		}
		if (inputRef.current) inputRef.current.value = "";
	}

	const ASPECT_CLASSES: Record<AspectMode, string> = {
		square: "aspect-square",
		threeFour: "aspect-[3/4]",
		twentyOneNine: "aspect-[21/9]",
		twentyOneSix: "aspect-[21/6]",
		twentyFourFour: "aspect-[24/4]",
		fullWidth: "aspect-[16/9]",
	};

	const fieldRatioClasses = ASPECT_CLASSES[fieldAspect ?? aspect];
	const previewRatioClasses = ASPECT_CLASSES[previewAspect ?? aspect];

	const computedGridClass = (() => {
		if (gridClassName && gridClassName.trim()) return gridClassName;
		const cols = Math.max(1, Math.min(12, Number(previewColumns ?? 0)));
		if (cols > 0) return `grid gap-3 grid-cols-${cols}`;
		return "grid gap-3 sm:grid-cols-2 lg:grid-cols-3";
	})();

	const bgUrl = backgroundImageUrl ?? "/images/pattern-svg.svg";
	const backgroundPatternStyle = {
		WebkitMaskImage: `url('${bgUrl}')`,
		maskImage: `url('${bgUrl}')`,
		WebkitMaskRepeat: "repeat",
		maskRepeat: "repeat",
		WebkitMaskSize: backgroundPatternSize ?? "800px",
		maskSize: backgroundPatternSize ?? "800px",
		backgroundColor: backgroundPatternColor ?? "var(--foreground)",
		opacity: typeof backgroundPatternOpacity === "number" ? backgroundPatternOpacity : 0.24,
	} as const;

	return (
		<div className={className}>
			<div className={`relative w-full overflow-hidden rounded-lg border border-border/60 ${fieldRatioClasses}`}>
				<div aria-hidden className="absolute inset-0 rounded-lg pointer-events-none" style={backgroundPatternStyle} />
				<label className="absolute inset-0 flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 text-center hover:bg-primary/5">
					<input ref={inputRef} id={id} type="file" accept="image/*" multiple className="hidden" onChange={handleInputChange} />
					<span className="text-sm font-medium text-foreground">{uploadLabel}</span>
					<span className="text-xs text-muted-foreground">Upload multiple images at once.</span>
				</label>
			</div>

			<div className={computedGridClass}>
				{selected.map((item) => (
					<div key={item.id} className={`group relative overflow-hidden rounded-lg border border-border/60 w-full ${previewRatioClasses}`}>
						<div aria-hidden className="absolute inset-0 rounded-lg pointer-events-none" style={backgroundPatternStyle} />
						<Image src={item.previewUrl} alt="Selected" fill unoptimized sizes="200px" className="object-cover" />
						{item.loading ? (
							<div className="absolute inset-0 flex items-center justify-center bg-overlay">
								<div className="h-7 w-7 animate-spin rounded-full border-2 border-foreground/60 border-t-transparent" />
							</div>
						) : null}
						{onRemove ? (
							<CtaIconButton
								size="sm"
								color="whiteBorder"
								className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100"
								onClick={() => onRemove(item.id)}
								ariaLabel="Remove image"
							>
								<Trash className="h-4 w-4" />
							</CtaIconButton>
						) : null}
					</div>
				))}
			</div>
			{typeof max === "number" ? <p className="mt-1 text-xs text-muted-foreground">You can add up to {max} images.</p> : null}
		</div>
	);
}

function deriveMultipleDefaults(aspect: AspectMode): ImageProcessOptions {
	switch (aspect) {
		case "twentyOneSix":
		case "twentyOneNine":
			return { maxWidth: 1920, maxHeight: 1080, mimeType: "image/webp", quality: 0.8 };
		case "threeFour":
		case "twentyFourFour":
			return { maxWidth: 1600, maxHeight: 1200, mimeType: "image/webp", quality: 0.8 };
		case "square":
		default:
			return { maxWidth: 1280, maxHeight: 1280, mimeType: "image/webp", quality: 0.8 };
	}
}

export default UploadMultiplePictures;
