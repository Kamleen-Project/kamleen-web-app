"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

type Props = Omit<ImageProps, "onError"> & { fallbackSrc?: string };

export function ImageWithFallback({ src, fallbackSrc = "/images/image-placeholder.png", ...rest }: Props) {
	const [currentSrc, setCurrentSrc] = useState<string>(String(src));
	const isBlob = typeof currentSrc === "string" && currentSrc.includes("public.blob.vercel-storage.com");
	return <Image {...rest} src={currentSrc} unoptimized={isBlob} onError={() => setCurrentSrc(fallbackSrc)} />;
}
