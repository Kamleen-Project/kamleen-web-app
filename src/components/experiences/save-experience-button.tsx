"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";

import { cn } from "@/lib/utils";
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

	const sizeClasses = size === "lg" ? "h-10 w-10" : size === "sm" ? "h-8 w-8" : "h-9 w-9";
	const iconSizeClass = size === "lg" ? "size-5" : "size-4";

	return (
		<button
			type="button"
			onClick={toggleSaved}
			aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
			className={cn(
				"inline-flex items-center justify-center rounded-full border border-border/60 bg-background text-foreground shadow-sm transition-colors hover:bg-accent/40",
				sizeClasses,
				className
			)}
			disabled={isPending}
		>
			<Heart className={cn(iconSizeClass, "transition-colors", saved ? "fill-red-500 text-red-500" : "text-foreground")} />
		</button>
	);
}
