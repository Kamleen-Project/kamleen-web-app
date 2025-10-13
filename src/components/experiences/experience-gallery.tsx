import Image from "next/image";
import { useState } from "react";

type ExperienceGalleryProps = {
	images: string[];
	title: string;
	onImageSelect?: (index: number) => void;
};

function chunkImages(images: string[], size: number) {
	const chunks: string[][] = [];
	for (let i = 0; i < images.length; i += size) {
		chunks.push(images.slice(i, i + size));
	}
	return chunks;
}

const tileBaseClass =
	"relative overflow-hidden rounded-3xl border border-border/60 bg-background/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

function GalleryTile({
	image,
	title,
	index,
	layoutClass,
	sizes,
	onSelect,
}: {
	image: string;
	title: string;
	index: number;
	layoutClass: string;
	sizes: string;
	onSelect?: (index: number) => void;
}) {
	const [src, setSrc] = useState<string>(image);
	const content = (
		<div className="relative h-full w-full">
			<Image
				src={src}
				alt={`Gallery image ${index + 1} for ${title}`}
				fill
				sizes={sizes}
				className="object-cover"
				onError={() => setSrc("/images/image-placeholder.png")}
			/>
		</div>
	);

	if (onSelect) {
		return (
			<button
				type="button"
				onClick={() => onSelect(index)}
				className={`${tileBaseClass} ${layoutClass} cursor-pointer transition hover:-translate-y-1 hover:shadow-lg`}
				aria-label={`Open image ${index + 1}`}
			>
				{content}
			</button>
		);
	}

	return <div className={`${tileBaseClass} ${layoutClass}`}>{content}</div>;
}

export function ExperienceGallery({ images, title, onImageSelect }: ExperienceGalleryProps) {
	const sections = chunkImages(images, 5);

	return (
		<div className="space-y-8">
			{sections.map((section, sectionIndex) => {
				const offset = sectionIndex * 5;

				return (
					<div key={`gallery-section-${sectionIndex}`} className="grid gap-4 md:auto-rows-[240px] md:grid-cols-12">
						{section[0] ? (
							<GalleryTile
								image={section[0]}
								title={title}
								index={offset}
								layoutClass="md:col-span-6 md:row-span-2"
								sizes="(min-width: 1280px) 45vw, (min-width: 768px) 60vw, 100vw"
								onSelect={onImageSelect}
							/>
						) : null}

						{section[1] ? (
							<GalleryTile
								image={section[1]}
								title={title}
								index={offset + 1}
								layoutClass="md:col-span-3 md:row-span-1"
								sizes="(min-width: 1280px) 25vw, (min-width: 768px) 30vw, 100vw"
								onSelect={onImageSelect}
							/>
						) : null}

						{section[2] || section[3] ? (
							<div className="grid gap-4 md:col-span-3 md:row-span-2">
								{section[2] ? (
									<GalleryTile
										image={section[2]}
										title={title}
										index={offset + 2}
										layoutClass="relative h-full min-h-[200px]"
										sizes="(min-width: 1280px) 20vw, (min-width: 768px) 25vw, 100vw"
										onSelect={onImageSelect}
									/>
								) : null}
								{section[3] ? (
									<GalleryTile
										image={section[3]}
										title={title}
										index={offset + 3}
										layoutClass="relative h-full min-h-[200px]"
										sizes="(min-width: 1280px) 20vw, (min-width: 768px) 25vw, 100vw"
										onSelect={onImageSelect}
									/>
								) : null}
							</div>
						) : null}

						{section[4] ? (
							<GalleryTile
								image={section[4]}
								title={title}
								index={offset + 4}
								layoutClass="md:col-span-3 md:row-span-1"
								sizes="(min-width: 1280px) 25vw, (min-width: 768px) 30vw, 100vw"
								onSelect={onImageSelect}
							/>
						) : null}
					</div>
				);
			})}
		</div>
	);
}
