"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CtaButton } from "@/components/ui/cta-button";
import { CtaIconButton } from "@/components/ui/cta-icon-button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormDescription, FormField, FormInput, FormLabel, FormSelect, FormTextarea } from "@/components/ui/form";
import { MapLatLng } from "@/components/ui/map-latlng";
import { ConsoleSubPage } from "@/components/console/subpage";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableHeaderRow, TableRow, TableContainer, TableEmpty, TableLoading } from "@/components/ui/table";
import { UploadSinglePicture } from "@/components/ui/upload-single-picture";

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
				const lat = Number.parseFloat(modal.draft.latitude);
				const lng = Number.parseFloat(modal.draft.longitude);
				if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
					throw new Error("Latitude and longitude are required for countries");
				}
				const endpoint =
					modal.mode === "edit" && modal.record
						? `/api/admin/data-manager/locations/countries/${modal.record.id}`
						: "/api/admin/data-manager/locations/countries";

				let response: Response;
				if (dropzone.country.file) {
					const formData = buildCountryFormData(
						{
							name: modal.draft.name.trim(),
							subtitle: modal.draft.subtitle.trim(),
							picture: modal.draft.picture,
							latitude: modal.draft.latitude,
							longitude: modal.draft.longitude,
						},
						dropzone.country.file
					);
					response = await fetch(endpoint, {
						method: modal.mode === "edit" ? "PATCH" : "POST",
						credentials: "include",
						body: formData,
					});
				} else {
					const payload = {
						name: modal.draft.name.trim(),
						subtitle: modal.draft.subtitle.trim(),
						picture: modal.draft.picture.trim(),
						latitude: lat,
						longitude: lng,
					};
					response = await fetch(endpoint, {
						method: modal.mode === "edit" ? "PATCH" : "POST",
						credentials: "include",
						headers: { "content-type": "application/json" },
						body: JSON.stringify(payload),
					});
				}
				if (!response.ok) {
					const data = await response.json().catch(() => ({}));
					throw new Error(data.message ?? "Unable to save country");
				}
				await loadLocations(modal.mode === "edit" ? "Country updated" : "Country created");
			}

			if (modal.entity === "state") {
				const endpoint =
					modal.mode === "edit" && modal.record ? `/api/admin/data-manager/locations/states/${modal.record.id}` : "/api/admin/data-manager/locations/states";
				let response: Response;
				if (dropzone.state.file) {
					const formData = buildStateFormData(
						{
							name: modal.draft.name.trim(),
							subtitle: modal.draft.subtitle.trim(),
							picture: modal.draft.picture,
							latitude: modal.draft.latitude,
							longitude: modal.draft.longitude,
							countryId: modal.draft.countryId,
						},
						dropzone.state.file
					);
					if (!modal.draft.countryId) throw new Error("Select a country for this state");
					response = await fetch(endpoint, {
						method: modal.mode === "edit" ? "PATCH" : "POST",
						credentials: "include",
						body: formData,
					});
				} else {
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
					response = await fetch(endpoint, {
						method: modal.mode === "edit" ? "PATCH" : "POST",
						credentials: "include",
						headers: { "content-type": "application/json" },
						body: JSON.stringify(payload),
					});
				}
				if (!response.ok) {
					const data = await response.json().catch(() => ({}));
					throw new Error(data.message ?? "Unable to save state");
				}
				await loadLocations(modal.mode === "edit" ? "State updated" : "State created");
			}

			if (modal.entity === "city") {
				const endpoint =
					modal.mode === "edit" && modal.record ? `/api/admin/data-manager/locations/cities/${modal.record.id}` : "/api/admin/data-manager/locations/cities";
				let response: Response;
				if (dropzone.city.file) {
					const formData = buildCityFormData(
						{
							name: modal.draft.name.trim(),
							subtitle: modal.draft.subtitle.trim(),
							picture: modal.draft.picture,
							latitude: modal.draft.latitude,
							longitude: modal.draft.longitude,
							countryId: modal.draft.countryId,
							stateId: modal.draft.stateId ? modal.draft.stateId : "",
						},
						dropzone.city.file
					);
					if (!modal.draft.countryId) throw new Error("Select a country for this city");
					response = await fetch(endpoint, {
						method: modal.mode === "edit" ? "PATCH" : "POST",
						credentials: "include",
						body: formData,
					});
				} else {
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
					response = await fetch(endpoint, {
						method: modal.mode === "edit" ? "PATCH" : "POST",
						credentials: "include",
						headers: { "content-type": "application/json" },
						body: JSON.stringify(payload),
					});
				}
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
			title="Location hierarchy"
			subtitle="Manage countries, states, and cities used throughout organizer onboarding and explorer search."
			action={
				<CtaButton onClick={() => openCountryModal("create")} size="md">
					Add country
				</CtaButton>
			}
		>
			{error ? <p className="text-sm text-destructive">{error}</p> : null}
			{feedback ? <p className="text-sm text-emerald-600">{feedback}</p> : null}

			<TableContainer>
				<Table>
					<TableHeader>
						<TableHeaderRow>
							<TableHead>Name</TableHead>
							<TableHead>States</TableHead>
							<TableHead>Cities</TableHead>
							<TableHead>Experiences</TableHead>
							<TableHead>Updated</TableHead>
							<TableHead>Actions</TableHead>
						</TableHeaderRow>
					</TableHeader>
					<TableBody>
						{loading ? (
							<TableLoading colSpan={6} label="Loading countries…" />
						) : countries.length === 0 ? (
							<TableEmpty colSpan={6}>No countries yet. Create one to begin managing hierarchy.</TableEmpty>
						) : (
							countries.map((country) => (
								<TableRow key={country.id}>
									<TableCell>
										<button type="button" className="text-left font-medium text-foreground hover:text-primary" onClick={() => setSelectedCountryId(country.id)}>
											{country.name}
										</button>
										<p className="text-xs text-muted-foreground">{country.subtitle ?? "—"}</p>
									</TableCell>
									<TableCell>{country.stats.stateCount}</TableCell>
									<TableCell>{country.stats.cityCount}</TableCell>
									<TableCell>
										<span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{country.stats.experienceCount}</span>
									</TableCell>
									<TableCell>{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(country.updatedAt))}</TableCell>
									<TableCell>
										<div className="flex flex-wrap gap-2">
											<CtaIconButton
												ariaLabel="Edit country"
												size="sm"
												color="whiteBorder"
												onClick={() => openCountryModal("edit", country)}
												disabled={pending}
											>
												<Pencil className="size-4" />
											</CtaIconButton>
											<CtaIconButton ariaLabel="Delete country" size="sm" color="red" onClick={() => deleteCountry(country)} disabled={pending}>
												<Trash2 className="size-4" />
											</CtaIconButton>
										</div>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</TableContainer>

			{countries.length ? (
				<div className="flex flex-col gap-2 my-4">
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
					<div className="flex flex-col gap-2 my-4">
						<div className="flex flex-row gap-2 items-start justify-between mb-4">
							<div className="flex flex-col gap-2">
								<div className="text-base font-semibold text-foreground">States in {selectedCountry.name}</div>
								<div className="text-sm text-muted-foreground">Manage sub-regions scoped to this country.</div>
							</div>
							<div className="flex gap-2">
								<CtaButton size="sm" onClick={() => openStateModal("create")} disabled={pending || !selectedCountryId}>
									Add state
								</CtaButton>
							</div>
						</div>
						<TableContainer>
							<Table>
								<TableHeader>
									<TableHeaderRow>
										<TableHead>Name</TableHead>
										<TableHead>Actions</TableHead>
									</TableHeaderRow>
								</TableHeader>
								<TableBody>
									{selectedCountry.states.length === 0 ? (
										<TableEmpty colSpan={2}>No states yet for this country.</TableEmpty>
									) : (
										selectedCountry.states.map((state) => (
											<TableRow key={state.id}>
												<TableCell>
													<span className="text-sm font-semibold text-foreground">{state.name}</span>
												</TableCell>
												<TableCell>
													<div className="flex gap-2">
														<CtaIconButton
															ariaLabel="Edit state"
															size="sm"
															color="whiteBorder"
															onClick={() => openStateModal("edit", state)}
															disabled={pending}
														>
															<Pencil className="size-4" />
														</CtaIconButton>
														<CtaIconButton ariaLabel="Delete state" size="sm" color="red" onClick={() => deleteState(state)} disabled={pending}>
															<Trash2 className="size-4" />
														</CtaIconButton>
													</div>
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</TableContainer>
					</div>

					<div className="flex flex-col gap-2 my-4">
						<div className="flex flex-row gap-2 items-start justify-between mb-4">
							<div className="flex flex-col gap-2">
								<div className="text-base font-semibold text-foreground">Cities in {selectedCountry.name}</div>
								<div className="text-sm text-muted-foreground">Filter by state or manage cities directly.</div>
							</div>

							<CtaButton size="sm" onClick={() => openCityModal("create")} disabled={pending || !selectedCountryId}>
								Add city
							</CtaButton>
						</div>
						<div className="flex mb-4 w-full">
							<FormField>
								<FormControl className="flex flex-col w-full">
									<FormLabel className="mr-2">Filter</FormLabel>
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
						</div>
						<TableContainer>
							<Table>
								<TableHeader>
									<TableHeaderRow>
										<TableHead>Name</TableHead>
										<TableHead>Actions</TableHead>
									</TableHeaderRow>
								</TableHeader>
								<TableBody>
									{cityRows.length === 0 ? (
										<TableEmpty colSpan={2}>No cities match this filter.</TableEmpty>
									) : (
										cityRows.map((city) => (
											<TableRow key={city.id}>
												<TableCell>
													<span className="text-sm font-semibold text-foreground">{city.name}</span>
												</TableCell>
												<TableCell>
													<div className="flex gap-2">
														<CtaIconButton ariaLabel="Edit city" size="sm" color="whiteBorder" onClick={() => openCityModal("edit", city)} disabled={pending}>
															<Pencil className="size-4" />
														</CtaIconButton>
														<CtaIconButton ariaLabel="Delete city" size="sm" color="red" onClick={() => deleteCity(city)} disabled={pending}>
															<Trash2 className="size-4" />
														</CtaIconButton>
													</div>
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</TableContainer>
					</div>
				</div>
			) : null}

			{modal ? (
				<div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/50 px-4 py-10">
					<div className="w-full max-w-3xl rounded-2xl border border-border/70 bg-background p-6 shadow-2xl max-h-[85vh] overflow-hidden">
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
							<CtaButton color="whiteBorder" size="sm" onClick={closeModal} disabled={pending}>
								Close
							</CtaButton>
						</div>

						<form onSubmit={handleSubmit} className="space-y-5">
							<div className="max-h-[60vh] overflow-y-auto pr-1 space-y-3">
								{modal.entity === "country" ? (
									<>
										<div className="grid gap-5 md:grid-cols-3">
											<div className="md:col-span-1">
												<FormField>
													<FormLabel>Hero image</FormLabel>
													<FormControl>
														<div className="flex flex-col gap-4">
															<UploadSinglePicture
																previewUrl={dropzone.country.preview ?? (modal.draft.picture || undefined)}
																uploadLabel="Upload hero image"
																aspect="threeFour"
																onChangeFile={(file) => {
																	if (!acceptedFile(file)) return;
																	updatePreview("country", file);
																}}
																onRemove={() => clearPreview("country")}
															/>
														</div>
													</FormControl>
													<FormDescription>Upload or drag an image (up to {MAX_UPLOAD_SIZE_MB}MB).</FormDescription>
												</FormField>
											</div>
											<div className="md:col-span-2 space-y-5">
												<FormField>
													<FormLabel>Name</FormLabel>
													<FormControl>
														<FormInput
															className="mb-2"
															value={modal.draft.name}
															onChange={(event) => updateDraft("name", event.target.value)}
															required
															disabled={pending}
														/>
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
											</div>
											<div className="md:col-span-3">
												<MapLatLng
													lat={modal.draft.latitude}
													lng={modal.draft.longitude}
													onLatChange={(value) => updateDraft("latitude", value)}
													onLngChange={(value) => updateDraft("longitude", value)}
													height={256}
													required
													hint={
														process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
															? "Click the map to set a pin and update coordinates."
															: "Add coordinates to preview a map, or set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for interactive pinning."
													}
												/>
											</div>
										</div>
									</>
								) : null}

								{modal.entity === "state" ? (
									<>
										<div className="grid gap-5 md:grid-cols-3">
											<div className="md:col-span-1">
												<FormField>
													<FormLabel>Image</FormLabel>
													<FormControl>
														<div className="flex flex-col gap-4">
															<UploadSinglePicture
																previewUrl={dropzone.state.preview ?? (modal.draft.picture || undefined)}
																uploadLabel="Upload image"
																aspect="threeFour"
																onChangeFile={(file) => {
																	if (!acceptedFile(file)) return;
																	updatePreview("state", file);
																}}
																onRemove={() => clearPreview("state")}
															/>
														</div>
													</FormControl>
													<FormDescription>Upload or drag an image (up to {MAX_UPLOAD_SIZE_MB}MB).</FormDescription>
												</FormField>
											</div>
											<div className="md:col-span-2 space-y-5">
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
											</div>
											<div className="md:col-span-3">
												<MapLatLng
													lat={modal.draft.latitude}
													lng={modal.draft.longitude}
													onLatChange={(value) => updateDraft("latitude", value)}
													onLngChange={(value) => updateDraft("longitude", value)}
													height={256}
													hint="Click the map to set a pin and update coordinates."
												/>
											</div>
										</div>
									</>
								) : null}

								{modal.entity === "city" ? (
									<>
										<div className="grid gap-5 md:grid-cols-3">
											<div className="md:col-span-1">
												<FormField>
													<FormLabel>Image</FormLabel>
													<FormControl>
														<div className="flex flex-col gap-4">
															<UploadSinglePicture
																previewUrl={dropzone.city.preview ?? (modal.draft.picture || undefined)}
																uploadLabel="Upload image"
																aspect="threeFour"
																onChangeFile={(file) => {
																	if (!acceptedFile(file)) return;
																	updatePreview("city", file);
																}}
																onRemove={() => clearPreview("city")}
															/>
														</div>
													</FormControl>
													<FormDescription>Upload or drag an image (up to {MAX_UPLOAD_SIZE_MB}MB).</FormDescription>
												</FormField>
											</div>
											<div className="md:col-span-2 space-y-5">
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
											</div>
											<div className="md:col-span-3">
												<MapLatLng
													lat={modal.draft.latitude}
													lng={modal.draft.longitude}
													onLatChange={(value) => updateDraft("latitude", value)}
													onLngChange={(value) => updateDraft("longitude", value)}
													height={256}
													hint="Click the map to set a pin and update coordinates."
												/>
											</div>
										</div>
									</>
								) : null}
							</div>
							<div className="flex items-center justify-between gap-2">
								<CtaButton type="button" color="whiteBorder" onClick={closeModal} disabled={pending}>
									Cancel
								</CtaButton>
								<CtaButton
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
								</CtaButton>
							</div>
						</form>
					</div>
				</div>
			) : null}
		</ConsoleSubPage>
	);
}
