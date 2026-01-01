"use client";

import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { useEffect, useState, useRef } from 'react';
import { ExperienceCarousel } from '@/components/experiences/experience-carousel';
import { getCarouselExperiences, type CarouselFilters } from '@/app/actions/get-carousel-experiences';
import type { Experience } from '@/components/cards/experience-card';
import { useGuideEditorContext } from './guide-editor-context';
import { ExperiencesModal } from './experiences-modal';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ExperienceCarouselNodeView(props: NodeViewProps) {
    const { node, updateAttributes, selected, editor } = props;
    const filters = node.attrs.filters as CarouselFilters;
    const [experiences, setExperiences] = useState<Experience[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [hasIntersected, setHasIntersected] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // safe context access
    const context = useGuideEditorContext();
    const isEditable = editor.isEditable;

    // Intersection Observer
    useEffect(() => {
        if (hasIntersected) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setHasIntersected(true);
                observer.disconnect();
            }
        });

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, [hasIntersected]);

    // Data Fetching
    useEffect(() => {
        if (!hasIntersected) return;

        let mounted = true;

        async function load() {
            try {
                setLoading(true);
                const data = await getCarouselExperiences(filters);
                if (mounted) {
                    setExperiences(data as unknown as Experience[]);
                }
            } catch (err) {
                console.error("Failed to load carousel experiences", err);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();

        return () => {
            mounted = false;
        };
    }, [filters, hasIntersected]);

    const handleUpdate = (newFilters: CarouselFilters, newTitle: string) => {
        updateAttributes({ filters: newFilters, title: newTitle });
    };

    if (!filters) return null;

    // Render logic
    const renderContent = () => {
        if (!hasIntersected || loading) {
            return (
                <div className="p-4 border rounded-lg bg-muted/20 flex justify-center items-center h-48">
                    <p className="text-muted-foreground animate-pulse">Loading experiences...</p>
                </div>
            );
        }

        if (experiences.length === 0) {
            return (
                <div className="p-4 border rounded-lg bg-muted/10 text-center relative group/carousel-node">
                    <p className="text-muted-foreground text-sm">No experiences found for the selected criteria.</p>
                    {isEditable && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover/carousel-node:opacity-100 transition-opacity z-10">
                            <Button variant="secondary" size="icon" onClick={() => setIsModalOpen(true)} className="h-8 w-8 shadow-sm" type="button">
                                <Settings className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className={cn(
                "relative rounded-lg transition-all",
                (selected && isEditable) ? "ring-2 ring-primary ring-offset-2" : ""
            )}>
                {isEditable && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover/carousel-node:opacity-100 transition-opacity z-10">
                        <Button variant="secondary" size="icon" onClick={() => setIsModalOpen(true)} className="h-8 w-8 shadow-sm" type="button">
                            <Settings className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                <ExperienceCarousel
                    title={node.attrs.title || "Recommended Experiences"}
                    experiences={experiences}
                    hideLocation={true}
                />
            </div>
        );
    };

    return (
        <NodeViewWrapper className="my-8 not-prose relative group/carousel-node">
            <div ref={containerRef} className="w-full">
                {renderContent()}
            </div>

            {isEditable && context && isModalOpen && (
                <ExperiencesModal
                    open={isModalOpen}
                    onOpenChange={setIsModalOpen}
                    onSelect={handleUpdate}
                    countries={context.countries}
                    categories={context.categories}
                    initialFilters={filters}
                    initialTitle={node.attrs.title}
                />
            )}
        </NodeViewWrapper>
    );
}
