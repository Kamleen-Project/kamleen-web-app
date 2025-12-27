
import Image from '@tiptap/extension-image'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ImageNodeView } from './image-node-view'

export const CustomImageExtension = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            caption: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-caption'),
                renderHTML: (attributes) => ({
                    'data-caption': attributes.caption,
                }),
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'figure',
                getAttrs: (node) => {
                    if (typeof node === 'string') return false;
                    const element = node as HTMLElement;
                    const img = element.querySelector('img');

                    if (!img) return false;

                    return {
                        src: img.getAttribute('src'),
                        alt: img.getAttribute('alt'),
                        title: img.getAttribute('title'),
                        width: img.getAttribute('width'),
                        height: img.getAttribute('height'),
                        caption: img.getAttribute('data-caption')
                    }
                }
            },
            {
                tag: 'img',
            }
        ]
    },

    addNodeView() {
        return ReactNodeViewRenderer(ImageNodeView)
    },

    renderHTML({ HTMLAttributes }) {
        const caption = HTMLAttributes['data-caption'];

        if (caption) {
            return ['figure', {},
                ['img', HTMLAttributes],
                ['figcaption', { class: 'text-center text-sm text-muted-foreground mt-2 italic' }, caption]
            ]
        }

        return ['img', HTMLAttributes]
    }
})
