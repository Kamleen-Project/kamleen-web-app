"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";

import { cn } from "@/lib/utils";
import CtaIconButton from "@/components/ui/cta-icon-button";
import { useNotifications } from "@/components/providers/notification-provider";

type ButtonSize = "sm" | "md" | "lg";

export function SaveExperienceButton({ experienceId, size = "md", className }: { experienceId: string; size?: ButtonSize; className?: string }) {
	const router = useRouter();
	const { notify } = useNotifications();
	const [isPending, startTransition] = useTransition();
	const [saved, setSaved] = useState<boolean>(false);

	useEffect(() => {
		let isMounted = true;
		const loadSaved = async () => {
			try {
				const res = await fetch(`/api/experiences/${experienceId}/save`, { cache: "no-store" });
				if (!res.ok) return;
				const data = (await res.json()) as { saved?: boolean };
				if (isMounted) setSaved(Boolean(data.saved));
			} catch {
				// ignore
			}
		};
		loadSaved();
		return () => {
			isMounted = false;
		};
	}, [experienceId]);

	const toggleSaved = () => {
		startTransition(async () => {
			const next = !saved;
			setSaved(next);
			try {
				const method = next ? "POST" : "DELETE";
				const res = await fetch(`/api/experiences/${experienceId}/save`, { method });
				if (res.status === 401) {
					router.push("/login");
					setSaved(!next);
					return;
				}
				if (!res.ok) {
					setSaved(!next);
					return;
				}
				// Success
				notify({
					title: next ? "Added to wishlist" : "Removed from wishlist",
					message: next ? "We saved this experience in your wishlist." : "We removed this experience from your wishlist.",
				});
			} catch {
				setSaved(!next);
			}
		});
	};

	const iconSizeClass = size === "lg" ? "size-5" : "size-4";

	return (
		<CtaIconButton
			type="button"
			onClick={toggleSaved}
			ariaLabel={saved ? "Remove from wishlist" : "Add to wishlist"}
			color="whiteBorder"
			size={size}
			className={className}
			disabled={isPending}
			isLoading={isPending}
		>
			<Heart className={cn(iconSizeClass, "transition-colors", saved ? "fill-red-500 text-red-500" : "text-foreground")} />
		</CtaIconButton>
	);
}
