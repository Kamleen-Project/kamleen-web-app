"use client";

import * as React from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface LightboxImage {
    src: string;
    alt?: string;
}

interface LightboxProps {
    images: LightboxImage[];
    index: number;
    isOpen: boolean;
    onClose: () => void;
    onIndexChange: (index: number) => void;
}

export function Lightbox({
    images,
    index,
    isOpen,
    onClose,
    onIndexChange
}: LightboxProps) {
    const currentImage = images[index];

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft") handlePrev();
            if (e.key === "ArrowRight") handleNext();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, index]);

    // Prevent scrolling when open
    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    const [direction, setDirection] = React.useState(0);

    const paginate = (newDirection: number) => {
        setDirection(newDirection);
        let newIndex = index + newDirection;
        if (newIndex < 0) newIndex = images.length - 1;
        if (newIndex >= images.length) newIndex = 0;
        onIndexChange(newIndex);
    };

    const handlePrev = () => paginate(-1);
    const handleNext = () => paginate(1);

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0,
            scale: 0.95
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 1000 : -1000,
            opacity: 0,
            scale: 0.95
        })
    };

    const swipeConfidenceThreshold = 10000;
    const swipePower = (offset: number, velocity: number) => {
        return Math.abs(offset) * velocity;
    };

    return (
        <MotionConfig transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm touch-none"
                        onClick={onClose}
                    >
                        {/* Close Button */}
                        <div className="absolute top-4 right-4 z-50">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full h-12 w-12"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                }}
                            >
                                <X className="h-6 w-6" />
                            </Button>
                        </div>

                        {/* Navigation Buttons */}
                        {images.length > 1 && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white/70 hover:text-white hover:bg-white/10 rounded-full h-12 w-12 hidden md:flex"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handlePrev();
                                    }}
                                >
                                    <ChevronLeft className="h-8 w-8" />
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white/70 hover:text-white hover:bg-white/10 rounded-full h-12 w-12 hidden md:flex"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleNext();
                                    }}
                                >
                                    <ChevronRight className="h-8 w-8" />
                                </Button>
                            </>
                        )}

                        {/* Image Container with Swipe */}
                        <div
                            className="relative w-full h-full max-w-7xl max-h-screen p-4 md:p-10 flex items-center justify-center overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <AnimatePresence initial={false} custom={direction}>
                                {currentImage && (
                                    <motion.div
                                        key={index}
                                        custom={direction}
                                        variants={variants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        drag="x"
                                        dragConstraints={{ left: 0, right: 0 }}
                                        dragElastic={1}
                                        onDragEnd={(e, { offset, velocity }) => {
                                            const swipe = swipePower(offset.x, velocity.x);

                                            if (swipe < -swipeConfidenceThreshold) {
                                                handleNext();
                                            } else if (swipe > swipeConfidenceThreshold) {
                                                handlePrev();
                                            }
                                        }}
                                        className="absolute w-full h-full flex items-center justify-center p-4 md:p-10"
                                    >
                                        <div className="relative w-full h-full">
                                            <Image
                                                src={currentImage.src}
                                                alt={currentImage.alt || "Lightbox image"}
                                                fill
                                                className="object-contain pointer-events-none" // prevent image drag
                                                priority
                                                quality={90}
                                                draggable={false}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            {/* Caption/Counter */}
                            <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-10 block">
                                <div className="bg-black/50 backdrop-blur-md text-white/90 px-4 py-2 rounded-full text-sm font-medium">
                                    {index + 1} / {images.length}
                                    {currentImage?.alt && <span className="mx-2 text-white/50">|</span>}
                                    {currentImage?.alt}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </MotionConfig>
    );
}
