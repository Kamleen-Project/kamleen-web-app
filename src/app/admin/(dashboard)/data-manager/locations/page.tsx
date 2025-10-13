"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormDescription, FormField, FormInput, FormLabel, FormSelect, FormTextarea } from "@/components/ui/form";
import { MiniMap } from "@/components/ui/mini-map";
import { ConsoleSubPage } from "@/components/console/subpage";

const MAX_UPLOAD_SIZE_MB = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type DropzoneBucket = {
	active: boolean;
	preview: string | null;
	file: File | null;
};

const INITIAL_DROPZONE_STATE: Record<"country" | "state" | "city", DropzoneBucket> = {
	country: { active: false, preview: null, file: null },
	state: { active: false, preview: null, file: null },
	city: { active: false, preview: null, file: null },
};

type CityRecord = {
	id: string;
	name: string;
	subtitle: string | null;
	picture: string;
	latitude: number | null;
	longitude: number | null;
	experienceCount: number;
	createdAt: string;
	updatedAt: string;
};

type StateRecord = {
	id: string;
	name: string;
	subtitle: string | null;
	picture: string | null;
	latitude: number | null;
	longitude: number | null;
	stats: {
		cityCount: number;
		experienceCount: number;
	};
	createdAt: string;
	updatedAt: string;
	cities: CityRecord[];
};

type CountryRecord = {
	id: string;
	name: string;
	subtitle: string | null;
	picture: string;
	latitude: number;
	longitude: number;
	stats: {
		stateCount: number;
		cityCount: number;
		experienceCount: number;
	};
	createdAt: string;
	updatedAt: string;
	states: StateRecord[];
	cities: CityRecord[];
};

type CountryDraft = {
	name: string;
	subtitle: string;
	picture: string;
	latitude: string;
	longitude: string;
};

type StateDraft = {
	name: string;
	subtitle: string;
	picture: string;
	latitude: string;
	longitude: string;
	countryId: string;
};

type CityDraft = {
	name: string;
	subtitle: string;
	picture: string;
	latitude: string;
	longitude: string;
	countryId: string;
	stateId: string;
};

type ModalState =
	| { entity: "country"; mode: "create" | "edit"; record?: CountryRecord; draft: CountryDraft }
	| { entity: "state"; mode: "create" | "edit"; record?: StateRecord; draft: StateDraft }
	| { entity: "city"; mode: "create" | "edit"; record?: CityRecord & { countryId: string; stateId?: string | null }; draft: CityDraft };

const EMPTY_COUNTRY_DRAFT: CountryDraft = {
	name: "",
	subtitle: "",
	picture: "",
	latitude: "",
	longitude: "",
};

function buildCountryFormData(draft: CountryDraft, file?: File) {
	const formData = new FormData();
	formData.append("name", draft.name.trim());
	formData.append("subtitle", draft.subtitle.trim());
	formData.append("latitude", draft.latitude.trim());
	formData.append("longitude", draft.longitude.trim());
	if (file) {
		formData.append("picture", file, file.name);
	}
	return formData;
}

function buildStateFormData(draft: StateDraft, file?: File) {
	const formData = new FormData();
	formData.append("name", draft.name.trim());
	formData.append("subtitle", draft.subtitle.trim());
	formData.append("countryId", draft.countryId);
	if (draft.latitude.trim()) formData.append("latitude", draft.latitude.trim());
	if (draft.longitude.trim()) formData.append("longitude", draft.longitude.trim());
	if (file) formData.append("picture", file, file.name);
	return formData;
}

function buildCityFormData(draft: CityDraft, file?: File) {
	const formData = new FormData();
	formData.append("name", draft.name.trim());
	formData.append("subtitle", draft.subtitle.trim());
	formData.append("countryId", draft.countryId);
	if (draft.stateId) formData.append("stateId", draft.stateId);
	if (draft.latitude.trim()) formData.append("latitude", draft.latitude.trim());
	if (draft.longitude.trim()) formData.append("longitude", draft.longitude.trim());
	if (file) formData.append("picture", file, file.name);
	return formData;
}

export default function DataManagerLocationsPage() {
	const [countries, setCountries] = useState<CountryRecord[]>([]);
	const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
	const [stateFilter, setStateFilter] = useState<string>("__ALL__");
	const [loading, setLoading] = useState(true);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [feedback, setFeedback] = useState<string | null>(null);
	const [modal, setModal] = useState<ModalState | null>(null);
	const [dropzone, setDropzone] = useState(INITIAL_DROPZONE_STATE);

	const countryInputRef = useRef<HTMLInputElement | null>(null);
	const stateInputRef = useRef<HTMLInputElement | null>(null);
	const cityInputRef = useRef<HTMLInputElement | null>(null);
	const objectUrlsRef = useRef<Record<"country" | "state" | "city", string | null>>({ country: null, state: null, city: null });
	const existingImageRef = useRef<Record<"country" | "state" | "city", string | null>>({ country: null, state: null, city: null });

	const acceptedFile = useCallback(
		(file: File) => {
			if (!ACCEPTED_TYPES.includes(file.type)) {
				setError("Unsupported file type. Please upload JPG, PNG, WebP, or GIF.");
				return false;
			}
			if (file.size > MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
				setError(`File is too large. Maximum size is ${MAX_UPLOAD_SIZE_MB}MB.`);
				return false;
			}
			return true;
		},
		[setError]
	);

	const updatePreview = (bucket: "country" | "state" | "city", file: File) => {
		if (objectUrlsRef.current[bucket]) {
			URL.revokeObjectURL(objectUrlsRef.current[bucket]!);
		}
		const preview = URL.createObjectURL(file);
		objectUrlsRef.current[bucket] = preview;
		setDropzone((prev) => ({
			...prev,
			[bucket]: {
				active: false,
				file,
				preview,
			},
		}));
		setModal((prev) => {
			if (!prev) return prev;
			if (prev.entity === bucket) {
				return { ...prev, draft: { ...prev.draft, picture: preview } } as ModalState;
			}
			return prev;
		});
	};

	const clearPreview = (bucket: "country" | "state" | "city") => {
		if (objectUrlsRef.current[bucket]) {
			URL.revokeObjectURL(objectUrlsRef.current[bucket]!);
		}
		objectUrlsRef.current[bucket] = null;
		setDropzone((prev) => ({
			...prev,
			[bucket]: {
				active: false,
				file: null,
				preview: null,
			},
		}));
		setModal((prev) => {
			if (!prev) return prev;
			if (prev.entity === bucket) {
				return { ...prev, draft: { ...prev.draft, picture: "" } } as ModalState;
			}
			return prev;
		});
	};

	const applyExistingPreview = (bucket: "country" | "state" | "city") => {
		const existing = existingImageRef.current[bucket];
		setDropzone((prev) => ({
			...prev,
			[bucket]: {
				active: false,
				file: null,
				preview: existing,
			},
		}));
		setModal((prev) => {
			if (!prev) return prev;
			if (prev.entity === bucket) {
				return { ...prev, draft: { ...prev.draft, picture: existing ?? "" } } as ModalState;
			}
			return prev;
		});
	};

	useEffect(() => {
		void loadLocations();
	}, []);

	useEffect(() => {
		return () => {
			(Object.keys(objectUrlsRef.current) as Array<"country" | "state" | "city">).forEach((key) => {
				const url = objectUrlsRef.current[key];
				if (url) URL.revokeObjectURL(url);
			});
		};
	}, []);

	async function loadLocations(message?: string) {
		setLoading(true);
		setError(null);
		setFeedback(message ?? null);
		try {
			const response = await fetch("/api/admin/data-manager/locations", {
				credentials: "include",
				cache: "no-store",
			});
			if (!response.ok) {
				throw new Error((await response.json().catch(() => ({}))).message ?? "Failed to load locations");
			}
			const data = (await response.json()) as { countries: CountryRecord[] };
			setCountries(data.countries);

			setSelectedCountryId((prev) => {
				if (prev && data.countries.some((country) => country.id === prev)) {
					return prev;
				}
				return data.countries[0]?.id ?? null;
			});
		} catch (cause) {
			console.error(cause);
			setError(cause instanceof Error ? cause.message : "Failed to load locations");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		setStateFilter("__ALL__");
	}, [selectedCountryId]);

	const selectedCountry = useMemo(() => countries.find((country) => country.id === selectedCountryId) ?? null, [countries, selectedCountryId]);

	const availableStates = useMemo(() => selectedCountry?.states ?? [], [selectedCountry]);

	const cityRows = useMemo(() => {
		if (!selectedCountry) return [] as Array<CityRecord & { state?: StateRecord | null }>;
		const nested = selectedCountry.states.flatMap((state) => state.cities.map((city) => ({ ...city, state })));
		const root = selectedCountry.cities.map((city) => ({ ...city, state: null as StateRecord | null }));
		const all = [...nested, ...root];
		if (stateFilter === "__ALL__") return all;
		if (stateFilter === "__UNASSIGNED__") return root;
		return all.filter((city) => city.state?.id === stateFilter);
	}, [selectedCountry, stateFilter]);

	function openCountryModal(mode: "create" | "edit", record?: CountryRecord) {
		setModal({
			entity: "country",
			mode,
			record,
			draft: record
				? {
						name: record.name,
						subtitle: record.subtitle ?? "",
						picture: record.picture,
						latitude: record.latitude.toString(),
						longitude: record.longitude.toString(),
				  }
				: { ...EMPTY_COUNTRY_DRAFT },
		});
		setDropzone(INITIAL_DROPZONE_STATE);
		existingImageRef.current.country = record?.picture ?? null;
		setError(null);
		setFeedback(null);
	}

	function openStateModal(mode: "create" | "edit", record?: StateRecord) {
		const countryId = selectedCountryId ?? "";
		setModal({
			entity: "state",
			mode,
			record,
			draft: record
				? {
						name: record.name,
						subtitle: record.subtitle ?? "",
						picture: record.picture ?? "",
						latitude: record.latitude != null ? record.latitude.toString() : "",
						longitude: record.longitude != null ? record.longitude.toString() : "",
						countryId,
				  }
				: {
						name: "",
						subtitle: "",
						picture: "",
						latitude: "",
						longitude: "",
						countryId,
				  },
		});
		setDropzone(INITIAL_DROPZONE_STATE);
		existingImageRef.current.state = record?.picture ?? null;
		setError(null);
		setFeedback(null);
	}

	function openCityModal(mode: "create" | "edit", record?: CityRecord & { state?: StateRecord | null }) {
		const countryId = selectedCountryId ?? "";
		const stateId = record?.state?.id ?? "";
		setModal({
			entity: "city",
			mode,
			record: record ? { ...record, countryId, stateId: stateId || null } : undefined,
			draft: record
				? {
						name: record.name,
						subtitle: record.subtitle ?? "",
						picture: record.picture,
						latitude: record.latitude != null ? record.latitude.toString() : "",
						longitude: record.longitude != null ? record.longitude.toString() : "",
						countryId,
						stateId: stateId ?? "",
				  }
				: {
						name: "",
						subtitle: "",
						picture: "",
						latitude: "",
						longitude: "",
						countryId,
						stateId: "",
				  },
		});
		setDropzone(INITIAL_DROPZONE_STATE);
		existingImageRef.current.city = record?.picture ?? null;
		setError(null);
		setFeedback(null);
	}

	function closeModal() {
		if (pending) return;
		(Object.keys(objectUrlsRef.current) as Array<"country" | "state" | "city">).forEach((key) => {
			const url = objectUrlsRef.current[key];
			if (url) URL.revokeObjectURL(url);
			objectUrlsRef.current[key] = null;
		});
		setDropzone(INITIAL_DROPZONE_STATE);
		setModal(null);
	}

	function updateDraft<K extends keyof CountryDraft | keyof StateDraft | keyof CityDraft>(key: K, value: string) {
		setModal((prev) => {
			if (!prev) return prev;
			if (prev.entity === "country") {
				return { ...prev, draft: { ...prev.draft, [key]: value } } as ModalState;
			}
			if (prev.entity === "state") {
				if (key === "countryId") {
					return { ...prev, draft: { ...prev.draft, countryId: value } } as ModalState;
				}
				return { ...prev, draft: { ...prev.draft, [key]: value } } as ModalState;
			}
			if (prev.entity === "city") {
				if (key === "countryId") {
					return { ...prev, draft: { ...prev.draft, countryId: value, stateId: "" } } as ModalState;
				}
				if (key === "stateId") {
					return { ...prev, draft: { ...prev.draft, stateId: value } } as ModalState;
				}
				return { ...prev, draft: { ...prev.draft, [key]: value } } as ModalState;
			}
			return prev;
		});
	}

	const countryOptions = useMemo(
		() =>
			countries.map((country) => ({
				id: country.id,
				name: country.name,
			})),
		[countries]
	);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!modal) return;
		setPending(true);
		setError(null);
		try {
			if (modal.entity === "country") {
				const payload = {
					name: modal.draft.name.trim(),
					subtitle: modal.draft.subtitle.trim(),
					picture: modal.draft.picture.trim(),
					latitude: Number.parseFloat(modal.draft.latitude),
					longitude: Number.parseFloat(modal.draft.longitude),
				};
				if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
					throw new Error("Latitude and longitude are required for countries");
				}
				const endpoint =
					modal.mode === "edit" && modal.record
						? `/api/admin/data-manager/locations/countries/${modal.record.id}`
						: "/api/admin/data-manager/locations/countries";
				const response = await fetch(endpoint, {
					method: modal.mode === "edit" ? "PATCH" : "POST",
					credentials: "include",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(payload),
				});
				if (!response.ok) {
					const data = await response.json().catch(() => ({}));
					throw new Error(data.message ?? "Unable to save country");
				}
				await loadLocations(modal.mode === "edit" ? "Country updated" : "Country created");
			}

			if (modal.entity === "state") {
				const payload = {
					name: modal.draft.name.trim(),
					subtitle: modal.draft.subtitle.trim(),
					picture: modal.draft.picture.trim() || null,
					latitude: modal.draft.latitude.trim() ? Number.parseFloat(modal.draft.latitude) : null,
					longitude: modal.draft.longitude.trim() ? Number.parseFloat(modal.draft.longitude) : null,
					countryId: modal.draft.countryId,
				};
				if (!payload.countryId) {
					throw new Error("Select a country for this state");
				}
				const endpoint =
					modal.mode === "edit" && modal.record ? `/api/admin/data-manager/locations/states/${modal.record.id}` : "/api/admin/data-manager/locations/states";
				const response = await fetch(endpoint, {
					method: modal.mode === "edit" ? "PATCH" : "POST",
					credentials: "include",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(payload),
				});
				if (!response.ok) {
					const data = await response.json().catch(() => ({}));
					throw new Error(data.message ?? "Unable to save state");
				}
				await loadLocations(modal.mode === "edit" ? "State updated" : "State created");
			}

			if (modal.entity === "city") {
				const payload = {
					name: modal.draft.name.trim(),
					subtitle: modal.draft.subtitle.trim(),
					picture: modal.draft.picture.trim(),
					latitude: modal.draft.latitude.trim() ? Number.parseFloat(modal.draft.latitude) : null,
					longitude: modal.draft.longitude.trim() ? Number.parseFloat(modal.draft.longitude) : null,
					countryId: modal.draft.countryId,
					stateId: modal.draft.stateId ? modal.draft.stateId : null,
				};
				if (!payload.countryId) {
					throw new Error("Select a country for this city");
				}
				const endpoint =
					modal.mode === "edit" && modal.record ? `/api/admin/data-manager/locations/cities/${modal.record.id}` : "/api/admin/data-manager/locations/cities";
				const response = await fetch(endpoint, {
					method: modal.mode === "edit" ? "PATCH" : "POST",
					credentials: "include",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(payload),
				});
				if (!response.ok) {
					const data = await response.json().catch(() => ({}));
					throw new Error(data.message ?? "Unable to save city");
				}
				await loadLocations(modal.mode === "edit" ? "City updated" : "City created");
			}

			closeModal();
		} catch (cause) {
			console.error(cause);
			setError(cause instanceof Error ? cause.message : "Unable to save changes");
		} finally {
			setPending(false);
		}
	}

	async function deleteCountry(country: CountryRecord) {
		if (!window.confirm(`Delete country “${country.name}”?`)) return;
		setPending(true);
		setFeedback(null);
		try {
			let response = await fetch(`/api/admin/data-manager/locations/countries/${country.id}`, {
				method: "DELETE",
				credentials: "include",
			});
			if (response.status === 409) {
				const data = await response.json().catch(() => ({}));
				const confirmForce = window.confirm(`${data.message ?? "Country in use."} Delete anyway and detach related records?`);
				if (!confirmForce) {
					setPending(false);
					return;
				}
				response = await fetch(`/api/admin/data-manager/locations/countries/${country.id}?force=true`, {
					method: "DELETE",
					credentials: "include",
				});
			}
			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.message ?? "Unable to delete country");
			}
			await loadLocations("Country deleted");
		} catch (cause) {
			console.error(cause);
			setError(cause instanceof Error ? cause.message : "Unable to delete country");
		} finally {
			setPending(false);
		}
	}

	async function deleteState(state: StateRecord) {
		if (!window.confirm(`Delete state “${state.name}”?`)) return;
		setPending(true);
		setFeedback(null);
		try {
			let response = await fetch(`/api/admin/data-manager/locations/states/${state.id}`, {
				method: "DELETE",
				credentials: "include",
			});
			if (response.status === 409) {
				const data = await response.json().catch(() => ({}));
				const confirmForce = window.confirm(`${data.message ?? "State in use."} Delete anyway and detach related records?`);
				if (!confirmForce) {
					setPending(false);
					return;
				}
				response = await fetch(`/api/admin/data-manager/locations/states/${state.id}?force=true`, {
					method: "DELETE",
					credentials: "include",
				});
			}
			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.message ?? "Unable to delete state");
			}
			await loadLocations("State deleted");
		} catch (cause) {
			console.error(cause);
			setError(cause instanceof Error ? cause.message : "Unable to delete state");
		} finally {
			setPending(false);
		}
	}

	async function deleteCity(city: CityRecord & { state?: StateRecord | null }) {
		if (!window.confirm(`Delete city “${city.name}”?`)) return;
		setPending(true);
		setFeedback(null);
		try {
			let response = await fetch(`/api/admin/data-manager/locations/cities/${city.id}`, {
				method: "DELETE",
				credentials: "include",
			});
			if (response.status === 409) {
				const data = await response.json().catch(() => ({}));
				const confirmForce = window.confirm(`${data.message ?? "City in use."} Delete anyway and detach related experiences?`);
				if (!confirmForce) {
					setPending(false);
					return;
				}
				response = await fetch(`/api/admin/data-manager/locations/cities/${city.id}?force=true`, {
					method: "DELETE",
					credentials: "include",
				});
			}
			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.message ?? "Unable to delete city");
			}
			await loadLocations("City deleted");
		} catch (cause) {
			console.error(cause);
			setError(cause instanceof Error ? cause.message : "Unable to delete city");
		} finally {
			setPending(false);
		}
	}

	type DropzoneBucketKey = "country" | "state" | "city";

	const getBucketByEntity = (entity: ModalState["entity"]): DropzoneBucketKey => {
		switch (entity) {
			case "country":
				return "country";
			case "state":
				return "state";
			case "city":
				return "city";
		}
	};

	const handleDragOver = useCallback((bucket: DropzoneBucketKey) => {
		setDropzone((prev) => {
			if (prev[bucket].active) return prev;
			return { ...prev, [bucket]: { ...prev[bucket], active: true } };
		});
	}, []);

	const handleDragLeave = useCallback((bucket: DropzoneBucketKey) => {
		setDropzone((prev) => {
			if (!prev[bucket].active) return prev;
			return { ...prev, [bucket]: { ...prev[bucket], active: false } };
		});
	}, []);

	const handleDrop = useCallback(
		(bucket: DropzoneBucketKey, event: React.DragEvent<HTMLDivElement>) => {
			event.preventDefault();
			event.stopPropagation();
			const file = event.dataTransfer.files?.[0];
			if (!file) return;
			if (!acceptedFile(file)) return;
			updatePreview(bucket, file);
		},
		[acceptedFile]
	);

	const handleFileChange = useCallback(
		(bucket: DropzoneBucketKey, event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (!file) return;
			if (!acceptedFile(file)) return;
			updatePreview(bucket, file);
		},
		[acceptedFile]
	);

	const handleFileInputRef = (bucket: DropzoneBucketKey, ref: HTMLInputElement | null) => {
		if (!ref) return;
		if (bucket === "country") {
			countryInputRef.current = ref;
		} else if (bucket === "state") {
			stateInputRef.current = ref;
		} else {
			cityInputRef.current = ref;
		}
	};

	return (
		<ConsoleSubPage
			backHref="/admin/data-manager"
			backLabel="← Back to data manager"
			badgeLabel="Locations"
			title="Location hierarchy"
			subtitle="Manage countries, states, and cities used throughout organizer onboarding and explorer search."
			action={<Button onClick={() => openCountryModal("create")}>Add country</Button>}
		>
			{error ? <p className="text-sm text-destructive">{error}</p> : null}
			{feedback ? <p className="text-sm text-emerald-600">{feedback}</p> : null}

			<Card className="border-border/70 bg-card/90">
				<CardHeader>
					<CardTitle>Countries</CardTitle>
					<CardDescription>
						API source: <code className="rounded bg-muted px-1 py-0.5 text-xs">/api/admin/data-manager/locations</code>
					</CardDescription>
				</CardHeader>
				<CardContent className="overflow-x-auto">
					{loading ? (
						<p className="px-2 py-10 text-center text-sm text-muted-foreground">Loading countries…</p>
					) : countries.length === 0 ? (
						<div className="rounded-lg border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
							No countries yet. Create one to begin managing hierarchy.
						</div>
					) : (
						<table className="min-w-full border-separate border-spacing-y-3 text-sm">
							<thead>
								<tr className="text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">
									<th className="px-3 py-2">Name</th>
									<th className="px-3 py-2">States</th>
									<th className="px-3 py-2">Cities</th>
									<th className="px-3 py-2">Experiences</th>
									<th className="px-3 py-2">Updated</th>
									<th className="px-3 py-2">Actions</th>
								</tr>
							</thead>
							<tbody>
								{countries.map((country) => (
									<tr key={country.id} className="rounded-lg border border-border/60 bg-background/90 text-foreground">
										<td className="px-3 py-3">
											<button
												type="button"
												className="text-left font-medium text-foreground hover:text-primary"
												onClick={() => setSelectedCountryId(country.id)}
											>
												{country.name}
											</button>
											<p className="text-xs text-muted-foreground">{country.subtitle ?? "—"}</p>
										</td>
										<td className="px-3 py-3 text-muted-foreground">{country.stats.stateCount}</td>
										<td className="px-3 py-3 text-muted-foreground">{country.stats.cityCount}</td>
										<td className="px-3 py-3">
											<span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{country.stats.experienceCount}</span>
										</td>
										<td className="px-3 py-3 text-muted-foreground">
											{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(country.updatedAt))}
										</td>
										<td className="px-3 py-3">
											<div className="flex flex-wrap gap-2">
												<Button variant="outline" size="sm" onClick={() => openCountryModal("edit", country)} disabled={pending}>
													Edit
												</Button>
												<Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteCountry(country)} disabled={pending}>
													Delete
												</Button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</CardContent>
			</Card>

			{countries.length ? (
				<div className="flex flex-col gap-2">
					<FormField>
						<FormLabel>Country</FormLabel>
						<FormControl>
							<FormSelect value={selectedCountryId ?? ""} onChange={(event) => setSelectedCountryId(event.target.value || null)}>
								<option value="">Select country</option>
								{countryOptions.map((option) => (
									<option key={option.id} value={option.id}>
										{option.name}
									</option>
								))}
							</FormSelect>
						</FormControl>
					</FormField>
				</div>
			) : null}

			{selectedCountry ? (
				<div className="grid gap-8 lg:grid-cols-2">
					<Card className="border-border/70 bg-card/90">
						<CardHeader className="flex flex-col gap-2">
							<CardTitle>States in {selectedCountry.name}</CardTitle>
							<CardDescription>Manage sub-regions scoped to this country.</CardDescription>
							<div className="flex gap-2">
								<Button size="sm" onClick={() => openStateModal("create")} disabled={pending || !selectedCountryId}>
									Add state
								</Button>
							</div>
						</CardHeader>
						<CardContent className="space-y-3">
							{selectedCountry.states.length === 0 ? (
								<p className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">No states yet for this country.</p>
							) : (
								<div className="space-y-3">
									{selectedCountry.states.map((state) => (
										<div key={state.id} className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/90 p-4">
											<div className="flex items-start justify-between gap-3">
												<div>
													<h3 className="text-sm font-semibold text-foreground">{state.name}</h3>
												</div>
												<div className="flex gap-2">
													<Button variant="outline" size="sm" onClick={() => openStateModal("edit", state)} disabled={pending}>
														Edit
													</Button>
													<Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteState(state)} disabled={pending}>
														Delete
													</Button>
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					<Card className="border-border/70 bg-card/90">
						<CardHeader className="flex flex-col gap-2">
							<CardTitle>Cities in {selectedCountry.name}</CardTitle>
							<CardDescription>Filter by state or manage cities directly.</CardDescription>
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<FormField>
									<FormLabel>Filter</FormLabel>
									<FormControl>
										<FormSelect value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>
											<option value="__ALL__">All cities</option>
											<option value="__UNASSIGNED__">Cities without state</option>
											{availableStates.map((state) => (
												<option key={state.id} value={state.id}>
													{state.name}
												</option>
											))}
										</FormSelect>
									</FormControl>
								</FormField>
								<Button size="sm" onClick={() => openCityModal("create")} disabled={pending || !selectedCountryId}>
									Add city
								</Button>
							</div>
						</CardHeader>
						<CardContent className="space-y-3">
							{cityRows.length === 0 ? (
								<p className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">No cities match this filter.</p>
							) : (
								<div className="space-y-3">
									{cityRows.map((city) => (
										<div key={city.id} className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/90 p-4">
											<div className="flex items-start justify-between gap-3">
												<div>
													<h3 className="text-sm font-semibold text-foreground">{city.name}</h3>
													<p className="text-xs text-muted-foreground">{city.state ? `${city.state.name}, ${selectedCountry.name}` : selectedCountry.name}</p>
												</div>
												<div className="flex gap-2">
													<Button variant="outline" size="sm" onClick={() => openCityModal("edit", city)} disabled={pending}>
														Edit
													</Button>
													<Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteCity(city)} disabled={pending}>
														Delete
													</Button>
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			) : null}

			{modal ? (
				<div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/50 px-4 py-10">
					<div className="w-full max-w-xl rounded-2xl border border-border/70 bg-background p-6 shadow-2xl max-h-[85vh] overflow-hidden">
						<div className="mb-4 flex items-start justify-between gap-4">
							<div>
								<h2 className="text-xl font-semibold text-foreground">
									{modal.mode === "edit" ? "Edit" : "Add"} {modal.entity}
								</h2>
								<p className="text-sm text-muted-foreground">
									{modal.entity === "country"
										? "Edit country level information."
										: modal.entity === "state"
										? "States require a parent country. Coordinates are optional."
										: "Cities attach to a country and optionally a state."}
								</p>
							</div>
							<Button variant="ghost" size="sm" onClick={closeModal} disabled={pending}>
								Close
							</Button>
						</div>

						<form onSubmit={handleSubmit} className="space-y-5">
							<div className="max-h-[60vh] overflow-y-auto pr-1">
								{modal.entity === "country" ? (
									<>
										<FormField>
											<FormLabel>Name</FormLabel>
											<FormControl>
												<FormInput value={modal.draft.name} onChange={(event) => updateDraft("name", event.target.value)} required disabled={pending} />
											</FormControl>
										</FormField>
										<FormField>
											<FormLabel>Subtitle</FormLabel>
											<FormControl>
												<FormTextarea
													rows={3}
													value={modal.draft.subtitle}
													onChange={(event) => updateDraft("subtitle", event.target.value)}
													required
													disabled={pending}
												/>
											</FormControl>
											<FormDescription>Describe the country for internal context.</FormDescription>
										</FormField>
										<FormField>
											<FormLabel>Hero image</FormLabel>
											<FormControl>
												<div className="flex flex-col gap-4">
													<div
														onDragOver={() => handleDragOver("country")}
														onDragLeave={() => handleDragLeave("country")}
														onDrop={handleDrop.bind(null, "country")}
														className={`relative flex h-48 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border border-dashed px-6 py-8 text-center transition hover:border-primary ${
															dropzone.country.active ? "border-primary bg-primary/5" : "border-border/60 bg-muted/20"
														}`}
														style={
															dropzone.country.preview
																? { backgroundImage: `url(${dropzone.country.preview})`, backgroundSize: "cover", backgroundPosition: "center" }
																: undefined
														}
														onClick={() => countryInputRef.current?.click()}
													>
														<div className={`absolute inset-0 ${dropzone.country.preview ? "bg-black/30" : "hidden"}`} />
														{!dropzone.country.preview ? (
															<div className="relative flex flex-col items-center gap-2 text-sm text-foreground">
																<p className="font-semibold text-primary drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]">Drag & drop an image here</p>
																<p className="text-xs text-muted-foreground drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)]">
																	or click to select a file (JPG, PNG, WebP, GIF up to {MAX_UPLOAD_SIZE_MB}MB)
																</p>
															</div>
														) : null}
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={() => countryInputRef.current?.click()}
															disabled={pending}
															className="absolute bottom-3 right-3"
														>
															Browse files
														</Button>
													</div>
													<input
														type="file"
														accept={ACCEPTED_TYPES.join(",")}
														className="hidden"
														ref={(ref) => handleFileInputRef("country", ref)}
														onChange={handleFileChange.bind(null, "country")}
														disabled={pending}
													/>
													<div className="flex flex-wrap items-center gap-2">
														<Button
															type="button"
															variant={modal.draft.picture && modal.entity === "country" ? "default" : "outline"}
															size="sm"
															onClick={() => applyExistingPreview("country")}
															disabled={pending || modal.mode !== "edit"}
														>
															Use existing image
														</Button>
														<Button type="button" variant="outline" size="sm" onClick={() => clearPreview("country")} disabled={pending}>
															Clear selection
														</Button>
													</div>
												</div>
											</FormControl>
											<FormDescription>
												Upload or drag an image (JPG, PNG, WebP, GIF up to {MAX_UPLOAD_SIZE_MB}MB). Keeping an existing image is allowed.
											</FormDescription>
										</FormField>
										<div className="grid gap-4 sm:grid-cols-2">
											<FormField>
												<FormLabel>Latitude</FormLabel>
												<FormControl>
													<FormInput
														type="number"
														step="any"
														value={modal.draft.latitude}
														onChange={(event) => updateDraft("latitude", event.target.value)}
														required
														disabled={pending}
													/>
												</FormControl>
											</FormField>
											<FormField>
												<FormLabel>Longitude</FormLabel>
												<FormControl>
													<FormInput
														type="number"
														step="any"
														value={modal.draft.longitude}
														onChange={(event) => updateDraft("longitude", event.target.value)}
														required
														disabled={pending}
													/>
												</FormControl>
											</FormField>
										</div>
										<div className="space-y-2">
											<div className="rounded-lg border border-border/60">
												<MiniMap
													latitude={modal.draft.latitude.trim() ? Number.parseFloat(modal.draft.latitude) : null}
													longitude={modal.draft.longitude.trim() ? Number.parseFloat(modal.draft.longitude) : null}
													onChange={(lat, lng) => {
														updateDraft("latitude", String(lat));
														updateDraft("longitude", String(lng));
													}}
													height={256}
												/>
											</div>
											<p className="text-xs text-muted-foreground">
												{process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
													? "Click the map to set a pin and update coordinates."
													: "Add coordinates to preview a map, or set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for interactive pinning."}
											</p>
										</div>
									</>
								) : null}

								{modal.entity === "state" ? (
									<>
										<FormField>
											<FormLabel>Parent country</FormLabel>
											<FormControl>
												<FormSelect value={modal.draft.countryId} onChange={(event) => updateDraft("countryId", event.target.value)} disabled={pending}>
													<option value="">Select country</option>
													{countryOptions.map((option) => (
														<option key={option.id} value={option.id}>
															{option.name}
														</option>
													))}
												</FormSelect>
											</FormControl>
										</FormField>
										<FormField>
											<FormLabel>Name</FormLabel>
											<FormControl>
												<FormInput value={modal.draft.name} onChange={(event) => updateDraft("name", event.target.value)} required disabled={pending} />
											</FormControl>
										</FormField>
										<FormField>
											<FormLabel>Subtitle</FormLabel>
											<FormControl>
												<FormTextarea
													rows={3}
													value={modal.draft.subtitle}
													onChange={(event) => updateDraft("subtitle", event.target.value)}
													disabled={pending}
												/>
											</FormControl>
										</FormField>
										<FormField>
											<FormLabel>Image</FormLabel>
											<FormControl>
												<div className="flex flex-col gap-4">
													<div
														onDragOver={() => handleDragOver("state")}
														onDragLeave={() => handleDragLeave("state")}
														onDrop={handleDrop.bind(null, "state")}
														className={`relative flex h-48 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border border-dashed px-6 py-8 text-center transition hover:border-primary ${
															dropzone.state.active ? "border-primary bg-primary/5" : "border-border/60 bg-muted/20"
														}`}
														style={
															dropzone.state.preview
																? { backgroundImage: `url(${dropzone.state.preview})`, backgroundSize: "cover", backgroundPosition: "center" }
																: undefined
														}
														onClick={() => stateInputRef.current?.click()}
													>
														<div className={`absolute inset-0 ${dropzone.state.preview ? "bg-black/30" : "hidden"}`} />
														{!dropzone.state.preview ? (
															<div className="relative flex flex-col items-center gap-2 text-sm text-foreground">
																<p className="font-semibold text-primary drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]">Drag & drop an image here</p>
																<p className="text-xs text-muted-foreground drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)]">
																	or click to select a file (JPG, PNG, WebP, GIF up to {MAX_UPLOAD_SIZE_MB}MB)
																</p>
															</div>
														) : null}
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={() => stateInputRef.current?.click()}
															disabled={pending}
															className="absolute bottom-3 right-3"
														>
															Browse files
														</Button>
													</div>
													<input
														type="file"
														accept={ACCEPTED_TYPES.join(",")}
														className="hidden"
														ref={(ref) => handleFileInputRef("state", ref)}
														onChange={handleFileChange.bind(null, "state")}
														disabled={pending}
													/>
													<div className="flex flex-wrap items-center gap-2">
														<Button
															type="button"
															variant={modal.entity === "state" && modal.record?.picture ? "default" : "outline"}
															size="sm"
															onClick={() => applyExistingPreview("state")}
															disabled={pending || modal.mode !== "edit"}
														>
															Use existing image
														</Button>
														<Button type="button" variant="outline" size="sm" onClick={() => clearPreview("state")} disabled={pending}>
															Clear selection
														</Button>
													</div>
												</div>
											</FormControl>
											<FormDescription>
												Upload or drag an image (JPG, PNG, WebP, GIF up to {MAX_UPLOAD_SIZE_MB}MB). Keeping an existing image is allowed.
											</FormDescription>
										</FormField>
										<div className="grid gap-4 sm:grid-cols-2">
											<FormField>
												<FormLabel>Latitude</FormLabel>
												<FormControl>
													<FormInput
														type="number"
														step="any"
														value={modal.draft.latitude}
														onChange={(event) => updateDraft("latitude", event.target.value)}
														disabled={pending}
													/>
												</FormControl>
											</FormField>
											<FormField>
												<FormLabel>Longitude</FormLabel>
												<FormControl>
													<FormInput
														type="number"
														step="any"
														value={modal.draft.longitude}
														onChange={(event) => updateDraft("longitude", event.target.value)}
														disabled={pending}
													/>
												</FormControl>
											</FormField>
										</div>
										<div className="space-y-2">
											<div className="rounded-lg border border-border/60">
												<MiniMap
													latitude={modal.draft.latitude.trim() ? Number.parseFloat(modal.draft.latitude) : null}
													longitude={modal.draft.longitude.trim() ? Number.parseFloat(modal.draft.longitude) : null}
													onChange={(lat, lng) => {
														updateDraft("latitude", String(lat));
														updateDraft("longitude", String(lng));
													}}
													height={256}
												/>
											</div>
											<p className="text-xs text-muted-foreground">Click the map to set a pin and update coordinates.</p>
										</div>
									</>
								) : null}

								{modal.entity === "city" ? (
									<>
										<FormField>
											<FormLabel>Country</FormLabel>
											<FormControl>
												<FormSelect value={modal.draft.countryId} onChange={(event) => updateDraft("countryId", event.target.value)} disabled={pending}>
													<option value="">Select country</option>
													{countryOptions.map((option) => (
														<option key={option.id} value={option.id}>
															{option.name}
														</option>
													))}
												</FormSelect>
											</FormControl>
										</FormField>
										<FormField>
											<FormLabel>State (optional)</FormLabel>
											<FormControl>
												<FormSelect
													value={modal.draft.stateId}
													onChange={(event) => updateDraft("stateId", event.target.value)}
													disabled={pending || !modal.draft.countryId}
												>
													<option value="">No state</option>
													{countries
														.filter((country) => country.id === modal.draft.countryId)
														.flatMap((country) => country.states)
														.map((state) => (
															<option key={state.id} value={state.id}>
																{state.name}
															</option>
														))}
												</FormSelect>
											</FormControl>
										</FormField>
										<FormField>
											<FormLabel>Name</FormLabel>
											<FormControl>
												<FormInput value={modal.draft.name} onChange={(event) => updateDraft("name", event.target.value)} required disabled={pending} />
											</FormControl>
										</FormField>
										<FormField>
											<FormLabel>Subtitle</FormLabel>
											<FormControl>
												<FormTextarea
													rows={3}
													value={modal.draft.subtitle}
													onChange={(event) => updateDraft("subtitle", event.target.value)}
													disabled={pending}
												/>
											</FormControl>
										</FormField>
										<FormField>
											<FormLabel>Image</FormLabel>
											<FormControl>
												<div className="flex flex-col gap-4">
													<div
														onDragOver={() => handleDragOver("city")}
														onDragLeave={() => handleDragLeave("city")}
														onDrop={handleDrop.bind(null, "city")}
														className={`relative flex h-48 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border border-dashed px-6 py-8 text-center transition hover:border-primary ${
															dropzone.city.active ? "border-primary bg-primary/5" : "border-border/60 bg-muted/20"
														}`}
														style={
															dropzone.city.preview
																? { backgroundImage: `url(${dropzone.city.preview})`, backgroundSize: "cover", backgroundPosition: "center" }
																: undefined
														}
														onClick={() => cityInputRef.current?.click()}
													>
														<div className={`absolute inset-0 ${dropzone.city.preview ? "bg-black/30" : "hidden"}`} />
														{!dropzone.city.preview ? (
															<div className="relative flex flex-col items-center gap-2 text-sm text-foreground">
																<p className="font-semibold text-primary drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]">Drag & drop an image here</p>
																<p className="text-xs text-muted-foreground drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)]">
																	or click to select a file (JPG, PNG, WebP, GIF up to {MAX_UPLOAD_SIZE_MB}MB)
																</p>
															</div>
														) : null}
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={() => cityInputRef.current?.click()}
															disabled={pending}
															className="absolute bottom-3 right-3"
														>
															Browse files
														</Button>
													</div>
													<input
														type="file"
														accept={ACCEPTED_TYPES.join(",")}
														className="hidden"
														ref={(ref) => handleFileInputRef("city", ref)}
														onChange={handleFileChange.bind(null, "city")}
														disabled={pending}
													/>
													<div className="flex flex-wrap items-center gap-2">
														<Button
															type="button"
															variant={modal.entity === "city" && modal.record?.picture ? "default" : "outline"}
															size="sm"
															onClick={() => applyExistingPreview("city")}
															disabled={pending || modal.mode !== "edit"}
														>
															Use existing image
														</Button>
														<Button type="button" variant="outline" size="sm" onClick={() => clearPreview("city")} disabled={pending}>
															Clear selection
														</Button>
													</div>
												</div>
											</FormControl>
											<FormDescription>
												Upload or drag an image (JPG, PNG, WebP, GIF up to {MAX_UPLOAD_SIZE_MB}MB). Keeping an existing image is allowed.
											</FormDescription>
										</FormField>
										<div className="grid gap-4 sm:grid-cols-2">
											<FormField>
												<FormLabel>Latitude</FormLabel>
												<FormControl>
													<FormInput
														type="number"
														step="any"
														value={modal.draft.latitude}
														onChange={(event) => updateDraft("latitude", event.target.value)}
														disabled={pending}
													/>
												</FormControl>
											</FormField>
											<FormField>
												<FormLabel>Longitude</FormLabel>
												<FormControl>
													<FormInput
														type="number"
														step="any"
														value={modal.draft.longitude}
														onChange={(event) => updateDraft("longitude", event.target.value)}
														disabled={pending}
													/>
												</FormControl>
											</FormField>
										</div>
										<div className="space-y-2">
											<div className="rounded-lg border border-border/60">
												<MiniMap
													latitude={modal.draft.latitude.trim() ? Number.parseFloat(modal.draft.latitude) : null}
													longitude={modal.draft.longitude.trim() ? Number.parseFloat(modal.draft.longitude) : null}
													onChange={(lat, lng) => {
														updateDraft("latitude", String(lat));
														updateDraft("longitude", String(lng));
													}}
													height={256}
												/>
											</div>
											<p className="text-xs text-muted-foreground">Click the map to set a pin and update coordinates.</p>
										</div>
									</>
								) : null}
							</div>
							<div className="flex items-center justify-between gap-2">
								<Button type="button" variant="ghost" onClick={closeModal} disabled={pending}>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={
										pending ||
										(modal.entity === "country" &&
											(!modal.draft.name.trim() ||
												!modal.draft.subtitle.trim() ||
												!modal.draft.picture.trim() ||
												!modal.draft.latitude.trim() ||
												!modal.draft.longitude.trim())) ||
										(modal.entity === "state" && (!modal.draft.countryId || !modal.draft.name.trim())) ||
										(modal.entity === "city" && (!modal.draft.countryId || !modal.draft.name.trim() || !modal.draft.picture.trim()))
									}
								>
									{pending ? "Saving…" : modal.mode === "edit" ? "Save changes" : "Create"}
								</Button>
							</div>
						</form>
					</div>
				</div>
			) : null}
		</ConsoleSubPage>
	);
}
