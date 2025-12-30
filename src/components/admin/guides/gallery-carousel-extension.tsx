
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { GalleryCarouselNodeView } from './gallery-carousel-node-view';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        galleryCarousel: {
            setGalleryCarousel: (options: { images: { src: string; alt?: string }[] }) => ReturnType,
        }
    }
}

export const GalleryCarouselExtension = Node.create({
    name: 'galleryCarousel',

    group: 'block',

    atom: true,

    addAttributes() {
        return {
            images: {
                default: [],
                parseHTML: element => {
                    const data = element.getAttribute('data-images');
                    try {
                        return data ? JSON.parse(data) : [];
                    } catch {
                        return [];
                    }
                },
                renderHTML: attributes => {
                    return {
                        'data-images': JSON.stringify(attributes.images),
                    }
                },
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="gallery-carousel"]',
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'gallery-carousel' })]
    },

    addCommands() {
        return {
            setGalleryCarousel:
                (options) =>
                    ({ commands }) => {
                        return commands.insertContent({
                            type: this.name,
                            attrs: options,
                        })
                    },
        }
    },

    addNodeView() {
        return ReactNodeViewRenderer(GalleryCarouselNodeView)
    },
})
