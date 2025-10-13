"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

type Props = Omit<ImageProps, "onError"> & { fallbackSrc?: string };

export function ImageWithFallback({ src, fallbackSrc = "/images/image-placeholder.png", ...rest }: Props) {
	const [currentSrc, setCurrentSrc] = useState<string>(String(src));
	return <Image {...rest} src={currentSrc} onError={() => setCurrentSrc(fallbackSrc)} />;
}
