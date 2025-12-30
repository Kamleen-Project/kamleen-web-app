"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { CustomImageExtension } from "@/components/admin/guides/image-extension";
import { GalleryCarouselExtension } from "@/components/admin/guides/gallery-carousel-extension";
import LinkExtension from "@tiptap/extension-link";
import YoutubeExtension from "@tiptap/extension-youtube";
import { useEffect } from "react";
import { GuideLightboxProvider, useGuideLightbox } from "./guide-lightbox-provider";
import { LightboxImage } from "@/components/ui/lightbox";

interface GuideContentProps {
    content: string;
}

function GuideEditorView({ content }: GuideContentProps) {
    const { setImages } = useGuideLightbox();

    const editor = useEditor({
        editable: false,
        immediatelyRender: false,
        extensions: [
            StarterKit,
            CustomImageExtension,
            GalleryCarouselExtension,
            LinkExtension.configure({
                openOnClick: false,
                HTMLAttributes: {
                    target: '_blank',
                    rel: 'noopener noreferrer',
                }
            }),
            YoutubeExtension,
        ],
        content: content,
        editorProps: {
            attributes: {
                class: 'prose prose-lg dark:prose-invert max-w-none mx-auto focus:outline-none',
            },
        },
    });

    useEffect(() => {
        if (editor && content) {
            // Extract all images from the document
            const images: LightboxImage[] = [];
            const doc = editor.getJSON();

            const traverse = (node: any) => {
                if (node.type === 'image') {
                    if (node.attrs?.src) {
                        images.push({
                            src: node.attrs.src,
                            alt: node.attrs.alt,
                        });
                    }
                } else if (node.type === 'galleryCarousel') {
                    if (node.attrs?.images && Array.isArray(node.attrs.images)) {
                        node.attrs.images.forEach((img: any) => {
                            if (img.src) {
                                images.push({
                                    src: img.src,
                                    alt: img.alt
                                });
                            }
                        });
                    }
                }

                if (node.content && Array.isArray(node.content)) {
                    node.content.forEach(traverse);
                }
            };

            traverse(doc);
            setImages(images);
        }
    }, [content, editor, setImages]);

    if (!editor) return null;

    return <EditorContent editor={editor} />;
}

export function GuideContent({ content }: GuideContentProps) {
    return (
        <GuideLightboxProvider>
            <GuideEditorView content={content} />
        </GuideLightboxProvider>
    );
}
