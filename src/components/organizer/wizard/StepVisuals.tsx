"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { UploadSinglePicture } from "@/components/ui/upload-single-picture";
import { UploadMultiplePictures } from "@/components/ui/upload-multiple-pictures";
import CtaIconButton from "@/components/ui/cta-icon-button";
import { Trash } from "lucide-react";
import { MAX_GALLERY_IMAGES } from "@/config/experiences";
import type { WizardState } from "@/types/experience-wizard";

export type StepVisualsProps = {
	state: WizardState;
	onHeroFileSelected: (file: File) => void;
	onRemoveHero: () => void;
	onGalleryAddFiles: (files: File[]) => void;
	onRemoveGalleryItem: (id: string) => void;
	// optional uploading indicators
	heroUploading?: boolean;
	galleryUploading?: Record<string, boolean>;
};

export default function StepVisuals({
	state,
	onHeroFileSelected,
	onRemoveHero,
	onGalleryAddFiles,
	onRemoveGalleryItem,
	heroUploading,
	galleryUploading,
}: StepVisualsProps) {
	const galleryCount = state.gallery.filter((item) => !item.removed).length;

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<div className="gap-2">
					<h3 className="text-base font-semibold text-foreground">Featured image</h3>
					<p className="text-sm text-muted-foreground">This hero photo is used across cards and top of the experience page.</p>
				</div>
				<div className="space-y-2">
					<UploadSinglePicture
						id="hero-image"
						previewUrl={state.hero.preview}
						onChangeFile={(file) => onHeroFileSelected(file)}
						onRemove={onRemoveHero}
						uploadLabel="Upload hero image"
						aspect="twentyOneSix"
						loading={Boolean(heroUploading)}
					/>
				</div>
			</div>

			<div className="space-y-2">
				<div className="gap-2">
					<h3 className="text-base font-semibold text-foreground">Gallery</h3>
					<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-sm text-muted-foreground">Showcase different moments—behind the scenes, preparation, or guest highlights.</p>
						<span className="text-xs font-medium text-muted-foreground">
							{galleryCount} / {MAX_GALLERY_IMAGES} images (min 5)
						</span>
					</div>
				</div>
				<div className="space-y-4">
					<UploadMultiplePictures
						id="gallery-images"
						selected={state.gallery
							.filter((item) => item.status === "new" && !item.removed)
							.map((item) => ({ id: item.id, previewUrl: item.preview ?? item.url ?? "", loading: Boolean(galleryUploading?.[item.id]) }))}
						onAddFiles={(files) => onGalleryAddFiles(Array.from(files))}
						onRemove={(id) => onRemoveGalleryItem(id)}
						uploadLabel="Add gallery photos"
						max={MAX_GALLERY_IMAGES}
						aspect="twentyFourFour"
						gridClassName="grid gap-3 sm:grid-cols-3 lg:grid-cols-5 mt-4"
						previewAspect="threeFour"
						previewColumns={5}
					/>
					{state.gallery.some((item) => item.status === "existing" && !item.removed) ? (
						<div className="mt-4">
							<p className="mb-2 text-xs text-muted-foreground">Existing images</p>
							<div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
								{state.gallery
									.filter((item) => item.status === "existing" && !item.removed)
									.map((item) => (
										<div key={item.id} className="relative overflow-hidden rounded-lg border border-border/60 aspect-[3/4]">
											<Image src={item.url ?? ""} alt="Existing" fill sizes="200px" unoptimized className="object-cover" />
											<CtaIconButton
												className="absolute right-2 top-2"
												size="sm"
												color="whiteBorder"
												onClick={() => onRemoveGalleryItem(item.id)}
												ariaLabel="Remove image"
											>
												<Trash className="h-4 w-4" />
											</CtaIconButton>
										</div>
									))}
							</div>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
