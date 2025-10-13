"use client";

import Image from "next/image";
import { useRef } from "react";
import { RefreshCcw, Trash } from "lucide-react";

type AspectMode = "square" | "threeFour" | "fullWidth";

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
	// Optional unique id base (useful when multiple instances exist on screen)
	id?: string;
	// Optional form field name so this input participates in form submission
	name?: string;
	// Optional className for container
	className?: string;
};

export function UploadSinglePicture({
	previewUrl,
	onChangeFile,
	onRemove,
	uploadLabel = "Upload image",
	aspect = "square",
	id,
	name,
	className = "",
}: UploadSinglePictureProps) {
	const inputRef = useRef<HTMLInputElement | null>(null);

	function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (file) {
			onChangeFile(file);
			event.currentTarget.value = "";
		}
	}

	const containerClasses = (() => {
		// Ensure fixed container sizing driven by aspect
		if (aspect === "square") return "relative overflow-hidden rounded-xl border border-border/60 w-40 h-40";
		if (aspect === "threeFour") return "relative overflow-hidden rounded-xl border border-border/60 w-40 h-[200px]"; // 160x200 roughly 4:5 visual, close to 3:4
		return "relative overflow-hidden rounded-xl border border-border/60 w-full h-48"; // full width save ratio in a fixed height holder
	})();

	return (
		<div className={`${containerClasses} ${className}`}>
			<input ref={inputRef} id={id} name={name} type="file" accept="image/*" className="hidden" onChange={handleInputChange} />
			{previewUrl ? (
				<>
					<Image src={previewUrl} alt="Selected image" fill unoptimized sizes="200px" className="object-cover" />
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
					htmlFor={id}
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
