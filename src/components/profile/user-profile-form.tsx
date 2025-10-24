"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CtaButton } from "@/components/ui/cta-button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { ProfileDetailsSections } from "./profile-details-sections";
import { useNotifications } from "@/components/providers/notification-provider";
import type { UserProfileData } from "./types";

export function UserProfileForm({ user }: { user: UserProfileData }) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [avatarPreview, setAvatarPreview] = useState<string>(user.image ?? "");
	const notifications = useNotifications();
	const [avatarFile, setAvatarFile] = useState<File | null>(null);
	const [avatarRemoved, setAvatarRemoved] = useState(false);
	const [objectUrl, setObjectUrl] = useState<string | null>(null);
	const [gender, setGender] = useState<string>(typeof user.gender === "string" ? user.gender : "");
	const initialBirthDate = useMemo(() => {
		if (!user.birthDate) return undefined;
		try {
			const d = new Date(user.birthDate);
			return isNaN(d.getTime()) ? undefined : d;
		} catch {
			return undefined;
		}
	}, [user.birthDate]);
	const [birthDate, setBirthDate] = useState<Date | undefined>(initialBirthDate);

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
					notifications?.notify({ title: "Update failed", message: data.message ?? "Unable to upload profile image", intent: "error" });
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
				notifications?.notify({ title: "Profile updated", message: "Profile image updated", intent: "success" });
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
				notifications?.notify({ title: "Update failed", message: data.message ?? "Unable to remove profile image", intent: "error" });
				// rollback local state if server failed
				setAvatarRemoved(false);
				setAvatarPreview(user.image ?? "");
				return;
			}
			setMessage("Profile image removed");
			notifications?.notify({ title: "Profile updated", message: "Profile image removed", intent: "success" });
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
			// inject gender
			if (gender) {
				formData.set("gender", gender);
			} else {
				formData.delete("gender");
			}

			// ensure birthDate is yyyy-MM-dd
			if (birthDate instanceof Date && !isNaN(birthDate.getTime())) {
				const yyyy = birthDate.getFullYear();
				const mm = String(birthDate.getMonth() + 1).padStart(2, "0");
				const dd = String(birthDate.getDate()).padStart(2, "0");
				formData.set("birthDate", `${yyyy}-${mm}-${dd}`);
			}
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
				notifications?.notify({ title: "Update failed", message: data.message ?? "Unable to update profile", intent: "error" });
				return;
			}

			setMessage("Profile saved successfully");
			notifications?.notify({ title: "Profile updated", message: "Profile saved successfully", intent: "success" });
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
				gender={gender}
				onGenderChange={setGender}
				birthDate={birthDate}
				onBirthDateChange={setBirthDate}
			/>
			<div className="flex flex-col gap-2 border border-border/60 bg-muted/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between rounded-lg">
				<div className="text-xs text-muted-foreground">All changes save to your profile instantly after submission.</div>
				<CtaButton type="submit" disabled={pending} isLoading={pending} className={cn(pending && "opacity-80")}>
					Save changes
				</CtaButton>
			</div>
			{/* Toasts replace inline messages */}
		</form>
	);
}
