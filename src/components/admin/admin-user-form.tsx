"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CtaButton } from "@/components/ui/cta-button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormControl, FormDescription, FormField, FormLabel, FormSelect } from "@/components/ui/form";
import { cn } from "@/lib/utils";

import { ProfileDetailsSections } from "@/components/profile/profile-details-sections";
import { useNotifications } from "@/components/providers/notification-provider";
import type { AdminUserProfileData } from "@/components/profile/types";

const USER_ROLES = ["EXPLORER", "ORGANIZER", "ADMIN"] as const;
const ACTIVE_ROLES = USER_ROLES;
const ORGANIZER_STATUSES = ["NOT_APPLIED", "PENDING", "APPROVED", "REJECTED"] as const;
const ACCOUNT_STATUSES = ["PENDING_VERIFICATION", "ONBOARDING", "ACTIVE", "INACTIVE", "BANNED", "ARCHIVED"] as const;

function formatLabel(value: string) {
	return value
		.toLowerCase()
		.split("_")
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(" ");
}

export function AdminUserForm({ user }: { user: AdminUserProfileData }) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [avatarPreview, setAvatarPreview] = useState<string>(user.image ?? "");
	const notifications = useNotifications();
	const [avatarFile, setAvatarFile] = useState<File | null>(null);
	const [avatarRemoved, setAvatarRemoved] = useState(false);
	const [objectUrl, setObjectUrl] = useState<string | null>(null);

	const avatarFallback = useMemo(() => {
		return (user.name ?? user.email ?? "User")
			.split(" ")
			.map((part) => part.charAt(0))
			.join("")
			.slice(0, 2)
			.toUpperCase();
	}, [user.name, user.email]);

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
				try {
					const fd = new FormData();
					fd.set("avatar", file);
					const response = await fetch(`/api/admin/users/${user.id}`, { method: "PATCH", body: fd });
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
				} catch (err) {
					const msg = "Network error while uploading image";
					setError(msg);
					notifications?.notify({ title: "Update failed", message: msg, intent: "error" });
					// rollback
					setAvatarFile(null);
					setAvatarPreview(user.image ?? "");
				}
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
			try {
				const fd = new FormData();
				fd.set("removeAvatar", "true");
				const response = await fetch(`/api/admin/users/${user.id}`, { method: "PATCH", body: fd });
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
			} catch (err) {
				const msg = "Network error while removing image";
				setError(msg);
				notifications?.notify({ title: "Update failed", message: msg, intent: "error" });
				// rollback
				setAvatarRemoved(false);
				setAvatarPreview(user.image ?? "");
			}
		});
	}

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);

		const textFields = ["name", "email", "headline", "bio", "location", "website", "phone", "role", "activeRole", "organizerStatus", "accountStatus"] as const;
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
			formData.set("avatar", avatarFile);
		}

		if (avatarRemoved) {
			formData.set("removeAvatar", "true");
		} else {
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

			try {
				const response = await fetch(`/api/admin/users/${user.id}`, {
					method: "PATCH",
					body: formData,
				});

				if (!response.ok) {
					const data = await response.json().catch(() => ({ message: "Unable to update user" }));
					setError(data.message ?? "Unable to update user");
					notifications?.notify({ title: "Update failed", message: data.message ?? "Unable to update user", intent: "error" });
					return;
				}

				setMessage("User updated successfully");
				notifications?.notify({ title: "User updated", message: "User updated successfully", intent: "success" });
				setAvatarFile(null);
				setAvatarRemoved(false);
				router.refresh();
			} catch (err) {
				const msg = "Network error while updating user";
				setError(msg);
				notifications?.notify({ title: "Update failed", message: msg, intent: "error" });
			}
		});
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<ProfileDetailsSections
				user={user}
				avatarPreview={avatarPreview}
				avatarFallback={avatarFallback}
				onAvatarChange={handleAvatarChange}
				onAvatarRemove={handleAvatarRemove}
				avatarRemoved={avatarRemoved}
				emailDescription="Update with caution – changing email will require the user to log in again."
				accountExtras={
					<div className="grid gap-4 sm:grid-cols-3">
						<FormField>
							<FormLabel>Base role</FormLabel>
							<FormControl>
								<FormSelect name="role" defaultValue={user.role}>
									{USER_ROLES.map((value) => (
										<option key={value} value={value}>
											{formatLabel(value)}
										</option>
									))}
								</FormSelect>
							</FormControl>
							<FormDescription>Determines the highest access level for the account.</FormDescription>
						</FormField>
						<FormField>
							<FormLabel>Active role</FormLabel>
							<FormControl>
								<FormSelect name="activeRole" defaultValue={user.activeRole}>
									{ACTIVE_ROLES.map((value) => (
										<option key={value} value={value}>
											{formatLabel(value)}
										</option>
									))}
								</FormSelect>
							</FormControl>
							<FormDescription>Switch the persona they see in the product.</FormDescription>
						</FormField>
						<FormField>
							<FormLabel>Organizer status</FormLabel>
							<FormControl>
								<FormSelect name="organizerStatus" defaultValue={user.organizerStatus}>
									{ORGANIZER_STATUSES.map((value) => (
										<option key={value} value={value}>
											{formatLabel(value)}
										</option>
									))}
								</FormSelect>
							</FormControl>
							<FormDescription>Track onboarding progress or approvals.</FormDescription>
						</FormField>
						<FormField>
							<FormLabel>Account status</FormLabel>
							<FormControl>
								<FormSelect name="accountStatus" defaultValue={user.accountStatus}>
									{ACCOUNT_STATUSES.map((value) => (
										<option key={value} value={value}>
											{formatLabel(value)}
										</option>
									))}
								</FormSelect>
							</FormControl>
							<FormDescription>Set overall account lifecycle status.</FormDescription>
						</FormField>
					</div>
				}
			/>
			{/* Danger zone */}
			<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
				<div className="mb-2 text-sm font-medium text-destructive">Danger zone</div>
				<p className="mb-3 text-sm text-muted-foreground">Deleting this user will permanently remove their account and related data.</p>
				<Dialog>
					<DialogTrigger asChild>
						<CtaButton type="button" color="white" className="bg-destructive text-white hover:bg-destructive/90">
							Delete user…
						</CtaButton>
					</DialogTrigger>
					<DialogContent>
						<DialogTitle>Delete this user?</DialogTitle>
						<DialogDescription>This action cannot be undone. This will permanently delete the user and all associated data.</DialogDescription>
						<DialogFooter>
							<DialogClose asChild>
								<CtaButton type="button" color="whiteBorder">
									Cancel
								</CtaButton>
							</DialogClose>
							<CtaButton
								type="button"
								color="white"
								className="bg-destructive text-white hover:bg-destructive/90"
								onClick={() => {
									startTransition(async () => {
										setError(null);
										setMessage(null);
										const response = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
										if (!response.ok) {
											const data = await response.json().catch(() => ({ message: "Unable to delete user" }));
											setError(data.message ?? "Unable to delete user");
											notifications?.notify({ title: "Delete failed", message: data.message ?? "Unable to delete user", intent: "error" });
											return;
										}
										notifications?.notify({ title: "User deleted", message: "User deleted successfully", intent: "success" });
										router.push("/admin/users");
									});
								}}
							>
								Delete user
							</CtaButton>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
			<div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="text-xs text-muted-foreground">Changes take effect immediately and will show in the user’s next session.</div>
				<CtaButton type="submit" color="black" disabled={pending} className={cn(pending && "opacity-80")}>
					Save updates
				</CtaButton>
			</div>
		</form>
	);
}
