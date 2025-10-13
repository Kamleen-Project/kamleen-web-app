"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormDescription, FormField, FormInput, FormLabel, FormTextarea } from "@/components/ui/form";
import { ConsoleSubPage } from "@/components/console/subpage";

type CategoryRecord = {
	id: string;
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
	source: "existing" | "upload";
	pictureFile: File | null;
	previewUrl: string | null;
};

const EMPTY_DRAFT: CategoryDraft = {
	name: "",
	subtitle: "",
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
	const dropActiveRef = useRef(false);
	const dropAreaRef = useRef<HTMLDivElement | null>(null);
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
			setCategories(data.categories);
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
		setDraft({ name: record.name, subtitle: record.subtitle, source: "existing", pictureFile: null, previewUrl: record.picture });
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

	async function handleDelete(record: CategoryRecord) {
		const confirmation = window.confirm(`Delete “${record.name}”? Existing experiences will lose their category unless you use force delete.`);
		if (!confirmation) return;

		setPending(true);
		setFeedback(null);
		try {
			const response = await fetch(`/api/admin/data-manager/categories/${record.id}`, {
				method: "DELETE",
				credentials: "include",
			});
			if (response.status === 409) {
				const confirmForce = window.confirm("This category is in use. Delete anyway and detach experiences?");
				if (!confirmForce) {
					setPending(false);
					return;
				}
				await fetch(`/api/admin/data-manager/categories/${record.id}?force=true`, {
					method: "DELETE",
					credentials: "include",
				});
			}
			await loadCategories("Category deleted");
		} catch (cause) {
			console.error(cause);
			setError(cause instanceof Error ? cause.message : "Unable to delete category");
		} finally {
			setPending(false);
		}
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
			badgeLabel="Categories"
			title="Experience categories"
			subtitle="Curate the core taxonomy explorers use to discover experiences. Manage names, subtitles, and hero imagery directly from this dashboard."
			action={
				<Button onClick={openCreateModal} disabled={pending}>
					Add category
				</Button>
			}
		>
			{error ? <p className="text-sm text-destructive">{error}</p> : null}
			{feedback ? <p className="text-sm text-emerald-600">{feedback}</p> : null}

			<Card className="border-border/70 bg-card/90">
				<CardHeader className="flex flex-col gap-2">
					<CardTitle>Categories</CardTitle>
					<CardDescription>
						API source: <code className="rounded bg-muted px-1 py-0.5 text-xs">/api/admin/data-manager/categories</code>
					</CardDescription>
				</CardHeader>
				<CardContent className="overflow-x-auto">
					{loading ? (
						<p className="px-2 py-10 text-center text-sm text-muted-foreground">Loading categories…</p>
					) : categories.length === 0 ? (
						<div className="rounded-lg border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
							No categories yet. Create the first one to get started.
						</div>
					) : (
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{categories.map((category) => (
								<div key={category.id} className="group/item relative aspect-[3/4] overflow-hidden rounded-xl border border-border/60 bg-muted/20">
									<div
										className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover/item:scale-105"
										style={{ backgroundImage: `url(${category.picture})` }}
									/>
									<div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/0 to-black/40" />
									<div className="absolute left-3 right-3 top-3 flex flex-col gap-1">
										<span className="w-fit rounded-lg bg-foreground/90 px-3 py-1.5 text-lg font-semibold text-background shadow">{category.name}</span>
										{category.subtitle ? (
											<span className="line-clamp-2 max-w-[85%] rounded-md bg-background/85 px-2 py-1 text-xs font-medium leading-snug text-foreground/90 backdrop-blur">
												{category.subtitle}
											</span>
										) : null}
									</div>
									<div className="absolute bottom-3 right-3 flex gap-1.5">
										<Button
											aria-label="Edit category"
											variant="outline"
											size="icon"
											onClick={() => openEditModal(category)}
											disabled={pending}
											className="bg-background/80 backdrop-blur"
										>
											<Pencil className="size-4" />
										</Button>
										<Button
											aria-label="Delete category"
											variant="ghost"
											size="icon"
											className="text-destructive bg-background/80 hover:bg-background/90 backdrop-blur"
											onClick={() => handleDelete(category)}
											disabled={pending}
										>
											<Trash2 className="size-4" />
										</Button>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{modalOpen ? (
				<div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4 py-6">
					<div className="relative w-full max-w-xl rounded-2xl border border-border/70 bg-background p-6 shadow-2xl">
						<div className="mb-4 flex items-start justify-between gap-4">
							<div>
								<h2 className="text-xl font-semibold text-foreground">{selected ? "Edit category" : "Add category"}</h2>
								<p className="text-sm text-muted-foreground">
									{selected ? "Update the category name, subtitle, or hero image." : "Create a new category explorers can browse."}
								</p>
							</div>
							<Button variant="ghost" size="sm" onClick={closeModal} disabled={pending}>
								Close
							</Button>
						</div>

						<form onSubmit={handleSubmit} className="space-y-5">
							<FormField>
								<FormLabel>Name</FormLabel>
								<FormControl>
									<FormInput value={draft.name} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} required disabled={pending} />
								</FormControl>
							</FormField>
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
							<FormField>
								<FormLabel>Hero image</FormLabel>
								<FormControl>
									<div className="flex flex-col gap-4">
										<div
											ref={dropAreaRef}
											onDragOver={(event) => {
												event.preventDefault();
												event.stopPropagation();
												if (!dropActiveRef.current) {
													dropActiveRef.current = true;
													setDraft((prev) => ({ ...prev, source: "upload" }));
													if (dropAreaRef.current) {
														dropAreaRef.current.classList.add("border-primary", "bg-primary/5");
													}
												}
											}}
											onDragLeave={(event) => {
												event.preventDefault();
												event.stopPropagation();
												dropActiveRef.current = false;
												if (dropAreaRef.current) {
													dropAreaRef.current.classList.remove("border-primary", "bg-primary/5");
												}
											}}
											onDrop={(event) => {
												event.preventDefault();
												event.stopPropagation();
												dropActiveRef.current = false;
												if (dropAreaRef.current) {
													dropAreaRef.current.classList.remove("border-primary", "bg-primary/5");
												}
												const file = event.dataTransfer.files?.[0];
												if (!file) return;
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
												setDraft((prev) => ({ ...prev, source: "upload", pictureFile: file, previewUrl: preview }));
											}}
											className="relative flex h-48 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 py-8 text-center transition hover:border-primary"
											style={
												draft.previewUrl ? { backgroundImage: `url(${draft.previewUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined
											}
										>
											<div className={`absolute inset-0 ${draft.previewUrl ? "bg-black/30" : "hidden"}`} />
											{!draft.previewUrl ? (
												<div className="relative flex flex-col items-center gap-3 text-sm text-foreground">
													<div className="font-semibold text-primary drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]">Drag & drop an image here</div>
													<div className="text-xs text-muted-foreground drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)]">
														or click to select a file (JPG, PNG, WebP, GIF up to {MAX_UPLOAD_SIZE_MB}MB)
													</div>
												</div>
											) : null}
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => fileInputRef.current?.click()}
												disabled={pending}
												className="absolute bottom-3 right-3"
											>
												Browse files
											</Button>
											<input
												ref={fileInputRef}
												type="file"
												accept={ACCEPTED_TYPES.join(",")}
												className="hidden"
												onChange={(event) => {
													const file = event.target.files?.[0];
													if (!file) return;
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
													setDraft((prev) => ({ ...prev, source: "upload", pictureFile: file, previewUrl: preview }));
												}}
												disabled={pending}
											/>
										</div>
										<div className="flex flex-wrap items-center gap-2 pt-3">
											<Button
												type="button"
												variant={draft.source === "existing" ? "default" : "outline"}
												size="sm"
												onClick={() => {
													setDraft((prev) => ({ ...prev, source: "existing", pictureFile: null, previewUrl: existingImageRef.current }));
													if (fileInputRef.current) {
														fileInputRef.current.value = "";
													}
												}}
												disabled={pending || !selected}
											>
												Use existing image
											</Button>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => {
													if (objectUrlRef.current) {
														URL.revokeObjectURL(objectUrlRef.current);
														objectUrlRef.current = null;
													}
													setDraft((prev) => ({ ...prev, source: "upload", pictureFile: null, previewUrl: null }));
													if (fileInputRef.current) {
														fileInputRef.current.value = "";
													}
												}}
												disabled={pending}
											>
												Clear selection
											</Button>
										</div>
									</div>
								</FormControl>
								<FormDescription>
									Upload or drag an image (JPG, PNG, WebP, GIF up to {MAX_UPLOAD_SIZE_MB}MB). Keeping an existing image is allowed.
								</FormDescription>
							</FormField>

							{error ? <p className="text-sm text-destructive">{error}</p> : null}

							<div className="flex items-center justify-between gap-2">
								<Button type="button" variant="ghost" onClick={closeModal} disabled={pending}>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={pending || !draft.name.trim() || !draft.subtitle.trim() || (!selected && draft.source === "upload" && !draft.pictureFile)}
								>
									{pending ? "Saving…" : selected ? "Save changes" : "Create category"}
								</Button>
							</div>
						</form>
					</div>
				</div>
			) : null}
		</ConsoleSubPage>
	);
}
