"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { CtaButton } from "@/components/ui/cta-button";
import { CtaIconButton } from "@/components/ui/cta-icon-button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormDescription, FormField, FormInput, FormLabel, FormTextarea } from "@/components/ui/form";
import { InputField } from "@/components/ui/input-field";
import { slugify } from "@/lib/slug";
import { ConsoleSubPage } from "@/components/console/subpage";
import { UploadSinglePicture } from "@/components/ui/upload-single-picture";

type CategoryRecord = {
	id: string;
	slug: string;
	name: string;
	subtitle: string;
	picture: string;
	experienceCount: number;
	createdAt: string;
	updatedAt: string;
};

type CategoryDraft = {
	name: string;
	subtitle: string;
	slug: string;
	source: "existing" | "upload";
	pictureFile: File | null;
	previewUrl: string | null;
};

const EMPTY_DRAFT: CategoryDraft = {
	name: "",
	subtitle: "",
	slug: "",
	source: "upload",
	pictureFile: null,
	previewUrl: null,
};

const MAX_UPLOAD_SIZE_MB = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function DataManagerCategoriesPage() {
	const [categories, setCategories] = useState<CategoryRecord[]>([]);
	const [selected, setSelected] = useState<CategoryRecord | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [draft, setDraft] = useState<CategoryDraft>(EMPTY_DRAFT);
	const [pending, setPending] = useState(false);
	const [feedback, setFeedback] = useState<string | null>(null);
	const objectUrlRef = useRef<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const existingImageRef = useRef<string | null>(null);

	useEffect(() => {
		void loadCategories();
		return () => {
			if (objectUrlRef.current) {
				URL.revokeObjectURL(objectUrlRef.current);
				objectUrlRef.current = null;
			}
		};
	}, []);

	async function loadCategories(message?: string) {
		setLoading(true);
		setError(null);
		setFeedback(message ?? null);
		try {
			const response = await fetch("/api/admin/data-manager/categories", {
				credentials: "include",
				cache: "no-store",
			});
			if (!response.ok) {
				throw new Error((await response.json().catch(() => ({}))).message ?? "Failed to load categories");
			}
			const data = (await response.json()) as { categories: CategoryRecord[] };
			setCategories(
				data.categories.map((c) => ({
					...c,
					slug: c.slug ?? slugify(c.name),
				}))
			);
		} catch (cause) {
			console.error(cause);
			setError(cause instanceof Error ? cause.message : "Failed to load categories");
		} finally {
			setLoading(false);
		}
	}

	function openCreateModal() {
		setSelected(null);
		setDraft(EMPTY_DRAFT);
		setModalOpen(true);
		setFeedback(null);
		setError(null);
		existingImageRef.current = null;
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}

	function openEditModal(record: CategoryRecord) {
		setSelected(record);
		setDraft({
			name: record.name,
			subtitle: record.subtitle,
			slug: record.slug ?? slugify(record.name),
			source: "existing",
			pictureFile: null,
			previewUrl: record.picture,
		});
		existingImageRef.current = record.picture;
		setModalOpen(true);
		setFeedback(null);
		setError(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}

	function closeModal() {
		if (pending) return;
		setModalOpen(false);
		setDraft(EMPTY_DRAFT);
		setSelected(null);
		existingImageRef.current = null;
		if (objectUrlRef.current) {
			URL.revokeObjectURL(objectUrlRef.current);
			objectUrlRef.current = null;
		}
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setPending(true);
		setError(null);
		try {
			const endpoint = selected ? `/api/admin/data-manager/categories/${selected.id}` : "/api/admin/data-manager/categories";

			let response: Response;

			if (draft.source === "upload" && draft.pictureFile) {
				const formData = new FormData();
				formData.append("name", draft.name.trim());
				formData.append("subtitle", draft.subtitle.trim());
				if (draft.slug.trim()) {
					formData.append("slug", draft.slug.trim());
				}
				formData.append("picture", draft.pictureFile, draft.pictureFile.name);

				response = await fetch(endpoint, {
					method: selected ? "PATCH" : "POST",
					credentials: "include",
					body: formData,
				});
			} else {
				const payload = {
					name: draft.name.trim(),
					subtitle: draft.subtitle.trim(),
					picture: existingImageRef.current ?? draft.previewUrl ?? "",
					slug: draft.slug.trim() || undefined,
				};

				if (!selected && !payload.picture) {
					throw new Error("Please upload a hero image for this category");
				}

				response = await fetch(endpoint, {
					method: selected ? "PATCH" : "POST",
					credentials: "include",
					headers: {
						"content-type": "application/json",
					},
					body: JSON.stringify(payload),
				});
			}

			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.message ?? "Unable to save category");
			}

			await loadCategories(selected ? "Category updated" : "Category created");
			closeModal();
		} catch (cause) {
			console.error(cause);
			setError(cause instanceof Error ? cause.message : "Unable to save category");
		} finally {
			setPending(false);
		}
	}

	const [confirmOpen, setConfirmOpen] = useState(false);
	const [confirmTarget, setConfirmTarget] = useState<CategoryRecord | null>(null);

	async function performDelete(record: CategoryRecord, { force = false }: { force?: boolean } = {}) {
		setPending(true);
		setFeedback(null);
		try {
			const url = `/api/admin/data-manager/categories/${record.id}${force ? "?force=true" : ""}`;
			const response = await fetch(url, { method: "DELETE", credentials: "include" });
			if (!response.ok) {
				if (response.status === 409 && !force) {
					// Retry with force when 409
					await performDelete(record, { force: true });
					return;
				}
				const data = await response.json().catch(() => ({}));
				throw new Error(data.message ?? "Unable to delete category");
			}
			await loadCategories("Category deleted");
			setConfirmOpen(false);
			setConfirmTarget(null);
		} catch (cause) {
			console.error(cause);
			setError(cause instanceof Error ? cause.message : "Unable to delete category");
		} finally {
			setPending(false);
		}
	}

	function handleDelete(record: CategoryRecord) {
		setConfirmTarget(record);
		setConfirmOpen(true);
	}

	const formatter = useMemo(
		() =>
			new Intl.DateTimeFormat("en", {
				year: "numeric",
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			}),
		[]
	);

	return (
		<ConsoleSubPage
			backHref="/admin/data-manager"
			backLabel="← Back to data manager"
			// badgeLabel="Categories"
			title="Experience categories"
			subtitle="Curate the core taxonomy explorers use to discover experiences. Manage names, subtitles, and hero imagery directly from this dashboard."
			action={<CtaButton onClick={openCreateModal} disabled={pending} label="Add category" />}
		>
			{error ? <p className="text-sm text-destructive">{error}</p> : null}
			{feedback ? <p className="text-sm text-emerald-600">{feedback}</p> : null}

			{/* <div> */}
			{loading ? (
				<p className="px-2 py-10 text-center text-sm text-muted-foreground">Loading categories…</p>
			) : categories.length === 0 ? (
				<div className="rounded-lg border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
					No categories yet. Create the first one to get started.
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{categories.map((category) => (
						<div key={category.id} className="group/item relative aspect-[3/4] overflow-hidden rounded-xl border border-border/60 bg-muted/20">
							<div
								className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover/item:scale-105"
								style={{ backgroundImage: `url(${category.picture})` }}
							/>
							<div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/0 to-black/40" />
							<div className="absolute left-3 right-3 top-3 flex flex-col gap-1">
								<span className="w-fit px-0 py-0 text-lg font-extrabold tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
									{category.name}
								</span>
								{category.subtitle ? (
									<span className="line-clamp-2 max-w-[85%] text-xs font-medium leading-snug text-white/90 opacity-0 transition-opacity duration-200 group-hover/item:opacity-100">
										{category.subtitle}
									</span>
								) : null}
							</div>
							<div className="absolute bottom-3 right-3 flex gap-1.5">
								<CtaIconButton
									ariaLabel="Edit category"
									onClick={() => openEditModal(category)}
									disabled={pending}
									className="bg-background/80 backdrop-blur"
									color="white"
									size="md"
								>
									<Pencil className="size-4" />
								</CtaIconButton>
								<CtaIconButton ariaLabel="Delete category" onClick={() => handleDelete(category)} disabled={pending} className="" color="red" size="md">
									<Trash2 className="size-4" />
								</CtaIconButton>
							</div>
						</div>
					))}
				</div>
			)}
			{/* </div> */}

			{modalOpen ? (
				<div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4 py-6">
					<div className="relative w-full max-w-xl rounded-2xl border border-border/70 bg-background p-6 shadow-2xl">
						<div className="mb-4 flex items-start justify-between gap-4">
							<div>
								<h2 className="text-xl font-semibold text-foreground">{selected ? "Edit category" : "Add category"}</h2>
								<p className="text-sm text-muted-foreground">
									{selected ? "Update the category name, subtitle, or cover image." : "Create a new category explorers can browse."}
								</p>
							</div>
							<CtaButton color="whiteBorder" size="sm" onClick={closeModal} disabled={pending}>
								Close
							</CtaButton>
						</div>

						<form onSubmit={handleSubmit} className="space-y-5">
							<div className="grid gap-5 md:grid-cols-3">
								<div className="md:col-span-1">
									<FormField>
										<FormLabel>Cover</FormLabel>
										<FormControl>
											<div className="flex flex-col gap-4">
												<UploadSinglePicture
													previewUrl={draft.previewUrl ?? undefined}
													uploadLabel="Upload cover image"
													aspect="fullWidth"
													onChangeFile={(file) => {
														if (!ACCEPTED_TYPES.includes(file.type)) {
															setError("Unsupported file type. Please upload JPG, PNG, WebP, or GIF.");
															return;
														}
														if (file.size > MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
															setError(`File is too large. Maximum size is ${MAX_UPLOAD_SIZE_MB}MB.`);
															return;
														}
														if (objectUrlRef.current) {
															URL.revokeObjectURL(objectUrlRef.current);
														}
														const preview = URL.createObjectURL(file);
														objectUrlRef.current = preview;
														setError(null);
														setDraft((prev) => ({ ...prev, source: "upload", pictureFile: file, previewUrl: preview }));
													}}
													onRemove={() => {
														if (objectUrlRef.current) {
															URL.revokeObjectURL(objectUrlRef.current);
															objectUrlRef.current = null;
														}
														setDraft((prev) => ({ ...prev, source: "upload", pictureFile: null, previewUrl: null }));
													}}
												/>
												<FormDescription>
													Upload a cover image (JPG, PNG, WebP, GIF up to {MAX_UPLOAD_SIZE_MB}MB). Keeping an existing image is allowed.
												</FormDescription>
											</div>
										</FormControl>
									</FormField>
								</div>
								<div className="md:col-span-2 space-y-5">
									<FormField>
										<FormLabel>Name</FormLabel>
										<FormControl>
											<FormInput
												value={draft.name}
												onChange={(event) => {
													const value = event.target.value;
													setDraft((prev) => ({ ...prev, name: value, slug: prev.slug ? prev.slug : slugify(value) }));
												}}
												required
												disabled={pending}
											/>
										</FormControl>
									</FormField>
									<InputField
										label="Slug"
										caption="Used in the URL. Only lowercase letters, numbers, and hyphens."
										value={draft.slug ?? ""}
										onChange={(e) => setDraft((prev) => ({ ...prev, slug: slugify(e.target.value) }))}
										placeholder="e.g. create"
										name="slug"
										id="slug"
										disabled={pending}
									/>
									<FormField>
										<FormLabel>Subtitle</FormLabel>
										<FormControl>
											<FormTextarea
												rows={3}
												value={draft.subtitle}
												onChange={(event) => setDraft((prev) => ({ ...prev, subtitle: event.target.value }))}
												required
												disabled={pending}
											/>
										</FormControl>
										<FormDescription>Appears on marketing surfaces and cards.</FormDescription>
									</FormField>
								</div>
							</div>

							{error ? <p className="text-sm text-destructive">{error}</p> : null}

							<div className="flex items-center justify-between gap-2">
								<CtaButton type="button" color="whiteBorder" onClick={closeModal} disabled={pending}>
									Cancel
								</CtaButton>
								<CtaButton
									type="submit"
									disabled={pending || !draft.name.trim() || !draft.subtitle.trim() || (!selected && draft.source === "upload" && !draft.pictureFile)}
								>
									{pending ? "Saving…" : selected ? "Save changes" : "Create category"}
								</CtaButton>
							</div>
						</form>
					</div>
				</div>
			) : null}
			{/* Confirm deletion dialog */}
			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<DialogContent>
					<DialogTitle>Delete this category?</DialogTitle>
					<DialogDescription>
						This action cannot be undone. If the category is in use by experiences, it will be removed and those experiences will be detached.
					</DialogDescription>
					{error ? <p className="text-sm text-destructive">{error}</p> : null}
					<DialogFooter>
						<DialogClose asChild>
							<CtaButton type="button" color="whiteBorder" disabled={pending}>
								Cancel
							</CtaButton>
						</DialogClose>
						<CtaButton
							type="button"
							disabled={pending || !confirmTarget}
							onClick={() => confirmTarget && performDelete(confirmTarget)}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							Delete category
						</CtaButton>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</ConsoleSubPage>
	);
}
