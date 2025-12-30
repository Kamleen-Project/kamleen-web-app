"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Lightbox, LightboxImage } from "@/components/ui/lightbox";

interface GuideLightboxContextType {
    openLightbox: (indexOrSrc: number | string) => void;
    images: LightboxImage[];
    setImages: (images: LightboxImage[]) => void;
}

const GuideLightboxContext = createContext<GuideLightboxContextType | undefined>(undefined);

export function useGuideLightbox() {
    const context = useContext(GuideLightboxContext);
    if (!context) {
        throw new Error("useGuideLightbox must be used within a GuideLightboxProvider");
    }
    return context;
}

export function GuideLightboxProvider({ children }: { children: ReactNode }) {
    const [images, setImages] = useState<LightboxImage[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    const openLightbox = (indexOrSrc: number | string) => {
        if (typeof indexOrSrc === "number") {
            setCurrentIndex(indexOrSrc);
        } else {
            const index = images.findIndex((img) => img.src === indexOrSrc);
            if (index !== -1) {
                setCurrentIndex(index);
            } else {
                // If source not found (e.g. slight mismatch), fallback to 0 or push?
                console.warn("Lightbox image not found in registry:", indexOrSrc);
                // Try to find by partial match if needed, but strict is better
                return;
            }
        }
        setIsOpen(true);
    };

    const closeLightbox = () => setIsOpen(false);

    return (
        <GuideLightboxContext.Provider value={{ openLightbox, images, setImages }}>
            {children}
            <Lightbox
                images={images}
                index={currentIndex}
                isOpen={isOpen}
                onClose={closeLightbox}
                onIndexChange={setCurrentIndex}
            />
        </GuideLightboxContext.Provider>
    );
}
