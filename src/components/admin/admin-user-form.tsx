"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormControl, FormDescription, FormField, FormLabel, FormSelect } from "@/components/ui/form";
import { cn } from "@/lib/utils";

import { ProfileDetailsSections } from "@/components/profile/profile-details-sections";
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

			const response = await fetch(`/api/admin/users/${user.id}`, {
				method: "PATCH",
				body: formData,
			});

			if (!response.ok) {
				const data = await response.json().catch(() => ({ message: "Unable to update user" }));
				setError(data.message ?? "Unable to update user");
				return;
			}

			setMessage("User updated successfully");
			setAvatarFile(null);
			setAvatarRemoved(false);
			router.refresh();
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
						<Button type="button" variant="destructive">
							Delete user…
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogTitle>Delete this user?</DialogTitle>
						<DialogDescription>This action cannot be undone. This will permanently delete the user and all associated data.</DialogDescription>
						<DialogFooter>
							<DialogClose asChild>
								<Button type="button" variant="outline">
									Cancel
								</Button>
							</DialogClose>
							<Button
								type="button"
								variant="destructive"
								onClick={() => {
									startTransition(async () => {
										setError(null);
										setMessage(null);
										const response = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
										if (!response.ok) {
											const data = await response.json().catch(() => ({ message: "Unable to delete user" }));
											setError(data.message ?? "Unable to delete user");
											return;
										}
										router.push("/admin/users");
									});
								}}
							>
								Delete user
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
			<div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="text-xs text-muted-foreground">Changes take effect immediately and will show in the user’s next session.</div>
				<Button type="submit" disabled={pending} className={cn(pending && "opacity-80")}>
					Save updates
				</Button>
			</div>
			{message ? <p className="text-sm text-emerald-600">{message}</p> : null}
			{error ? <p className="text-sm text-destructive">{error}</p> : null}
		</form>
	);
}
