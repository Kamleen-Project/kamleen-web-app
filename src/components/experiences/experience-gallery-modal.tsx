"use client";

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

type TriggerRender = (helpers: { open: () => void }) => ReactNode;

const masonryContainerClass = "w-full columns-1 gap-4 sm:columns-2 lg:columns-3";
const masonryItemClass = "relative mb-4 block overflow-hidden rounded-2xl border border-white/10 bg-white/5";
const masonryItemStyle: CSSProperties = {
	breakInside: "avoid",
	pageBreakInside: "avoid",
};

export function ExperienceGalleryModal({ title, images, trigger }: { title: string; images: string[]; trigger: TriggerRender }) {
	const [open, setOpen] = useState(false);
	const [mounted, setMounted] = useState(false);

	const totalImages = images.length;

	const openModal = useCallback(() => {
		if (!totalImages) return;
		setOpen(true);
	}, [totalImages]);

	const closeModal = useCallback(() => {
		setOpen(false);
	}, []);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!open || totalImages === 0) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				closeModal();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		document.body.classList.add("overflow-hidden");

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.body.classList.remove("overflow-hidden");
		};
	}, [closeModal, open, totalImages]);

	const modalContent =
		!mounted || !open
			? null
			: createPortal(
					<div className="fixed inset-0 z-[200] bg-black/80" role="dialog" aria-modal="true">
						<div className="flex h-full flex-col">
							<header className="flex items-center justify-between border-b border-white/10 px-6 py-5 text-white">
								<div>
									<p className="text-xs uppercase tracking-[0.3em] text-white/70">Full gallery</p>
									<h2 className="text-lg font-semibold">{title}</h2>
									<p className="text-xs text-white/60">{images.length} photos</p>
								</div>
								<div className="flex items-center gap-3">
									<Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={closeModal}>
										<X className="h-5 w-5" />
										<span className="sr-only">Close gallery</span>
									</Button>
								</div>
							</header>

							<div className="flex-1 overflow-y-auto px-6 pb-10 pt-6">
								{totalImages ? (
									<div className={masonryContainerClass}>
										{images.map((src, index) => (
											<div key={`${src}-${index}`} className={masonryItemClass} style={masonryItemStyle}>
												<FallbackImage
													src={src}
													alt={`Gallery image ${index + 1} for ${title}`}
													width={1200}
													height={800}
													sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 90vw"
													className="h-auto w-full"
												/>
											</div>
										))}
									</div>
								) : null}
							</div>
						</div>
					</div>,
					document.body
			  );

	return (
		<>
			{trigger({ open: openModal })}
			{modalContent}
		</>
	);
}

function FallbackImage(props: Omit<React.ComponentProps<typeof Image>, "onError">) {
	const [src, setSrc] = useState<string>(String(props.src));
	return <Image {...props} src={src} onError={() => setSrc("/images/image-placeholder.png")} />;
}
