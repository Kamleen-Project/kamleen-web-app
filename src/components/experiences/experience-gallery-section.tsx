"use client"

import { useMemo } from "react"
import { Images } from "lucide-react"

import { ExperienceGallery } from "@/components/experiences/experience-gallery"
import { ExperienceGalleryModal } from "@/components/experiences/experience-gallery-modal"
import { Button } from "@/components/ui/button"

type ExperienceGallerySectionProps = {
  title: string
  images: string[]
}

export function ExperienceGallerySection({ title, images }: ExperienceGallerySectionProps) {
  const previewImages = useMemo(() => images.slice(0, 5), [images])
  const hasMoreImages = images.length > previewImages.length

  return (
    <ExperienceGalleryModal
      title={title}
      images={images}
      trigger={({ open }) => (
        <div className="relative">
          <ExperienceGallery images={previewImages} title={title} onImageSelect={() => open()} />
          {hasMoreImages ? (
            <div className="absolute right-4 top-4 z-10">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-2 bg-black/60 text-white shadow-sm backdrop-blur transition hover:bg-black/70"
                onClick={() => open()}
              >
                <Images className="h-4 w-4" />
                Show all photos
              </Button>
            </div>
          ) : null}
        </div>
      )}
    />
  )
}
