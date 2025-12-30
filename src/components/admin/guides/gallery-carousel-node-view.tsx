"use client";

import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { GalleryCarousel } from '@/components/ui/gallery-carousel';
import { cn } from '@/lib/utils';
import { useGuideLightbox } from '@/components/guides/guide-lightbox-provider';

export const GalleryCarouselNodeView = (props: NodeViewProps) => {
    const images = props.node.attrs.images || [];

    const isEditable = props.editor.isEditable;

    // Safely use context
    let lightboxContext: any = null;
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        lightboxContext = useGuideLightbox();
    } catch {
        // Context might be missing
    }

    const handleImageClick = (src: string) => {
        if (!isEditable && lightboxContext) {
            lightboxContext.openLightbox(src);
        }
    };

    return (
        <NodeViewWrapper className={cn("gallery-carousel-wrapper my-6 select-none", (props.selected && isEditable) && "ring-2 ring-primary rounded-xl")}>
            <GalleryCarousel
                images={images}
                onImageClick={!isEditable && lightboxContext ? handleImageClick : undefined}
            />
        </NodeViewWrapper>
    );
};
