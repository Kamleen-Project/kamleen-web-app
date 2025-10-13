"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { ProfileDetailsSections } from "./profile-details-sections";
import type { UserProfileData } from "./types";

export function UserProfileForm({ user }: { user: UserProfileData }) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [avatarPreview, setAvatarPreview] = useState<string>(user.image ?? "");
	const [avatarFile, setAvatarFile] = useState<File | null>(null);
	const [avatarRemoved, setAvatarRemoved] = useState(false);
	const [objectUrl, setObjectUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!avatarFile && !avatarRemoved) {
			setAvatarPreview(user.image ?? "");
		}
	}, [user.image, avatarFile, avatarRemoved]);

	useEffect(() => {
		return () => {
			if (objectUrl) {
				URL.revokeObjectURL(objectUrl);
			}
		};
	}, [objectUrl]);

	function handleAvatarChange(file: File | null) {
		if (objectUrl) {
			URL.revokeObjectURL(objectUrl);
			setObjectUrl(null);
		}

		if (file) {
			const previewUrl = URL.createObjectURL(file);
			setAvatarPreview(previewUrl);
			setObjectUrl(previewUrl);
			setAvatarFile(file);
			setAvatarRemoved(false);

			// Immediately persist the new avatar
			startTransition(async () => {
				setMessage(null);
				setError(null);
				const fd = new FormData();
				fd.set("avatar", file);
				const response = await fetch("/api/profile", { method: "PATCH", body: fd });
				if (!response.ok) {
					const data = await response.json().catch(() => ({ message: "Unable to upload profile image" }));
					setError(data.message ?? "Unable to upload profile image");
					// rollback preview on failure
					if (objectUrl) {
						URL.revokeObjectURL(objectUrl);
						setObjectUrl(null);
					}
					setAvatarFile(null);
					setAvatarPreview(user.image ?? "");
					return;
				}
				setMessage("Profile image updated");
				router.refresh();
			});
		} else {
			setAvatarFile(null);
			setAvatarRemoved(false);
			setAvatarPreview(user.image ?? "");
		}
	}

	function handleAvatarRemove() {
		if (objectUrl) {
			URL.revokeObjectURL(objectUrl);
			setObjectUrl(null);
		}
		setAvatarFile(null);
		setAvatarRemoved(true);
		setAvatarPreview("");

		startTransition(async () => {
			setMessage(null);
			setError(null);
			const fd = new FormData();
			fd.set("removeAvatar", "true");
			const response = await fetch("/api/profile", { method: "PATCH", body: fd });
			if (!response.ok) {
				const data = await response.json().catch(() => ({ message: "Unable to remove profile image" }));
				setError(data.message ?? "Unable to remove profile image");
				// rollback local state if server failed
				setAvatarRemoved(false);
				setAvatarPreview(user.image ?? "");
				return;
			}
			setMessage("Profile image removed");
			router.refresh();
		});
	}

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);

		const textFields = ["name", "headline", "bio", "location", "website", "phone"] as const;
		const preferenceFields = ["preferredLanguage", "preferredCurrency", "preferredTimezone"] as const;
		for (const field of textFields) {
			const value = formData.get(field);
			if (typeof value === "string") {
				formData.set(field, value.trim());
			}
		}

		if (!avatarFile) {
			formData.delete("avatar");
		} else {
			// Ensure the file is present even if the input element was cleared in the uploader
			formData.set("avatar", avatarFile);
		}
		if (!avatarRemoved) {
			formData.set("removeAvatar", "false");
		}

		for (const field of preferenceFields) {
			const value = formData.get(field);
			if (typeof value === "string") {
				formData.set(field, value.trim());
			}
		}

		startTransition(async () => {
			setMessage(null);
			setError(null);

			const response = await fetch("/api/profile", {
				method: "PATCH",
				body: formData,
			});

			if (!response.ok) {
				const data = await response.json().catch(() => ({ message: "Unable to update profile" }));
				setError(data.message ?? "Unable to update profile");
				return;
			}

			setMessage("Profile saved successfully");
			setAvatarFile(null);
			setAvatarRemoved(false);
			router.refresh();
		});
	}

	const avatarFallback = useMemo(() => {
		return (user.name ?? "Kamleen User")
			.split(" ")
			.map((part) => part.charAt(0))
			.join("")
			.slice(0, 2)
			.toUpperCase();
	}, [user.name]);

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<ProfileDetailsSections
				user={user}
				avatarPreview={avatarPreview}
				avatarFallback={avatarFallback}
				onAvatarChange={handleAvatarChange}
				onAvatarRemove={handleAvatarRemove}
				avatarRemoved={avatarRemoved}
				emailReadOnly
				emailDescription="Email addresses can only be changed by the Kamleen support team."
			/>
			<div className="flex flex-col gap-2 border border-border/60 bg-muted/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between rounded-lg">
				<div className="text-xs text-muted-foreground">All changes save to your profile instantly after submission.</div>
				<Button type="submit" disabled={pending} className={cn(pending && "opacity-80")}>
					Save changes
				</Button>
			</div>
			{message ? <p className="text-sm text-emerald-600">{message}</p> : null}
			{error ? <p className="text-sm text-destructive">{error}</p> : null}
		</form>
	);
}
