"use client";

import { useMemo } from "react";
import { Images } from "lucide-react";

import { ExperienceGallery } from "@/components/experiences/experience-gallery";
import { ExperienceGalleryModal } from "@/components/experiences/experience-gallery-modal";
import { CtaButton } from "@/components/ui/cta-button";

type ExperienceGallerySectionProps = {
	title: string;
	images: string[];
};

export function ExperienceGallerySection({ title, images }: ExperienceGallerySectionProps) {
	const previewImages = useMemo(() => images.slice(0, 5), [images]);
	const hasMoreImages = images.length > previewImages.length;

	return (
		<ExperienceGalleryModal
			title={title}
			images={images}
			trigger={({ open }) => (
				<div className="relative">
					<ExperienceGallery images={previewImages} title={title} onImageSelect={() => open()} />
					{hasMoreImages ? (
						<div className="absolute right-4 top-4 z-10">
							<CtaButton type="button" color="black" size="md" onClick={() => open()} startIcon={<Images className="size-4" />}>
								Show all photos
							</CtaButton>
						</div>
					) : null}
				</div>
			)}
		/>
	);
}
