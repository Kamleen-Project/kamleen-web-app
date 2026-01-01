
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ExperienceCarouselNodeView } from './experience-carousel-node-view';
import type { CarouselFilters } from '@/app/actions/get-carousel-experiences';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        experienceCarousel: {
            setExperienceCarousel: (options: { filters: CarouselFilters; title?: string }) => ReturnType,
        }
    }
}

export const ExperienceCarouselExtension = Node.create({
    name: 'experienceCarousel',

    group: 'block',

    atom: true,

    addAttributes() {
        return {
            filters: {
                default: {},
                parseHTML: element => {
                    const data = element.getAttribute('data-filters');
                    try {
                        return data ? JSON.parse(data) : {};
                    } catch {
                        return {};
                    }
                },
                renderHTML: attributes => {
                    return {
                        'data-filters': JSON.stringify(attributes.filters),
                    }
                },
            },
            title: {
                default: 'Recommended Experiences',
                parseHTML: element => element.getAttribute('data-title'),
                renderHTML: attributes => {
                    return {
                        'data-title': attributes.title,
                    }
                },
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="experience-carousel"]',
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'experience-carousel' })]
    },

    addCommands() {
        return {
            setExperienceCarousel:
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
        return ReactNodeViewRenderer(ExperienceCarouselNodeView)
    },
})
