"use client";

import Image from "next/image";
import { useRef } from "react";

type AspectMode = "square" | "threeFour" | "fullWidth";

export type UploadMultiplePicturesItem = {
	id: string;
	previewUrl: string;
};

export type UploadMultiplePicturesProps = {
	selected: UploadMultiplePicturesItem[];
	onAddFiles: (files: File[]) => void;
	onRemove?: (id: string) => void;
	uploadLabel?: string;
	max?: number;
	aspect?: AspectMode;
	id?: string;
	className?: string;
	gridClassName?: string;
};

export function UploadMultiplePictures({
	selected,
	onAddFiles,
	onRemove,
	uploadLabel = "Add photos",
	max,
	aspect = "threeFour",
	id,
	className = "",
	gridClassName = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
}: UploadMultiplePicturesProps) {
	const inputRef = useRef<HTMLInputElement | null>(null);

	function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
		const files = Array.from(event.target.files ?? []);
		if (files.length) onAddFiles(files);
		if (inputRef.current) inputRef.current.value = "";
	}

	const ratioClasses = aspect === "square" ? "aspect-square" : aspect === "threeFour" ? "aspect-[3/4]" : "aspect-[16/9]";

	return (
		<div className={className}>
			<label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-background/70 px-6 py-8 text-center transition hover:border-primary hover:bg-primary/5">
				<input ref={inputRef} id={id} type="file" accept="image/*" multiple className="hidden" onChange={handleInputChange} />
				<span className="text-sm font-medium text-foreground">{uploadLabel}</span>
				<span className="text-xs text-muted-foreground">Upload multiple images at once.</span>
			</label>

			<div className={gridClassName}>
				{selected.map((item) => (
					<div key={item.id} className={`group relative overflow-hidden rounded-xl border border-border/60 w-full ${ratioClasses}`}>
						<Image src={item.previewUrl} alt="Selected" fill unoptimized sizes="200px" className="object-cover" />
						{onRemove ? (
							<button
								type="button"
								className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition group-hover:opacity-100"
								onClick={() => onRemove(item.id)}
								aria-label="Remove image"
							>
								×
							</button>
						) : null}
					</div>
				))}
			</div>
			{typeof max === "number" ? <p className="mt-1 text-xs text-muted-foreground">You can add up to {max} images.</p> : null}
		</div>
	);
}

export default UploadMultiplePictures;
