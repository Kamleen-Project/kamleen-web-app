"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { AuthModal } from "@/components/auth/auth-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface HeroBannerProps {
    mobileImage: string;
    desktopImage: string;
    className?: string;
    actionType: "LINK" | "MODAL";
    linkUrl: string | null;
    modalTitle: string | null;
    modalContent: string | null;
    requiresAuth: boolean;
}

export function HeroBanner({
    mobileImage,
    desktopImage,
    className,
    actionType,
    linkUrl,
    modalTitle,
    modalContent,
    requiresAuth
}: HeroBannerProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const [authOpen, setAuthOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);

    if (!mobileImage || !desktopImage) return null;

    const handleClick = () => {
        // Check Authentication
        if (requiresAuth && !session) {
            setAuthOpen(true);
            return;
        }

        // Perform Action
        if (actionType === "LINK" && linkUrl) {
            router.push(linkUrl);
        } else if (actionType === "MODAL") {
            setModalOpen(true);
        }
    };

    return (
        <>
            <div
                className={cn("relative w-full overflow-hidden cursor-pointer transition hover:opacity-[0.98]", className)}
                onClick={handleClick}
                role="button"
                tabIndex={0}
            >
                {/* Mobile Image (Aspect 3:1) */}
                <div className="block md:hidden relative w-full aspect-[3/1]">
                    <Image
                        src={mobileImage}
                        alt="Banner"
                        fill
                        className="object-cover"
                        sizes="100vw"
                        priority
                    />
                </div>

                {/* Desktop Image (Aspect 6:1) */}
                <div className="hidden md:block relative w-full aspect-[6/1]">
                    <Image
                        src={desktopImage}
                        alt="Banner"
                        fill
                        className="object-cover"
                        sizes="100vw"
                        priority
                    />
                </div>
            </div>

            <AuthModal
                open={authOpen}
                mode="register" // Default to register as per requirement ("open the sign up modal")
                onOpenChange={setAuthOpen}
                onModeChange={() => { }} // Simple toggle, no mode switch needed inside here for this context usually, but required prop
                redirectTo={typeof window !== "undefined" ? window.location.pathname : undefined}
            />

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        {modalTitle && <DialogTitle>{modalTitle}</DialogTitle>}
                    </DialogHeader>
                    {modalContent && (
                        <div
                            className="mt-2 text-base text-foreground/80 prose prose-sm max-w-none [&_a]:text-primary [&_a]:underline [&_a]:font-medium"
                            dangerouslySetInnerHTML={{ __html: modalContent }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
