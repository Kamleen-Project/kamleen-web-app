"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { CtaButton } from "@/components/ui/cta-button";
import BalloonLoading from "@/components/ui/balloon-loading";
import { CtaIconButton } from "@/components/ui/cta-icon-button";
import { Download } from "lucide-react";

import { ExperienceWizard } from "./experience-wizard";

type CategoryOption = { id: string; name: string };
type LocationCountry = {
	id: string;
	name: string;
	states: { id: string; name: string; cities: { id: string; name: string; latitude: number; longitude: number }[] }[];
	cities: { id: string; name: string; latitude: number; longitude: number }[];
};

type CurrencyResponse = { currency: string };

type ImportedItineraryStep = {
	id?: string;
	order?: number;
	title: string;
	subtitle?: string | null;
	image: string;
	duration?: string | null;
};

type ImportedSession = {
	id?: string;
	startAt: string; // ISO datetime string
	duration?: string | null;
	capacity: number;
	priceOverride?: number | null;
	locationLabel?: string | null;
	meetingAddress?: string | null;
	meetingLatitude?: number | null;
	meetingLongitude?: number | null;
	useDifferentLocation?: boolean;
	reservedGuests?: number;
};

type ImportedExperienceJson = {
	title: string;
	summary?: string;
	description?: string;
	category?: string; // name
	categoryId?: string;
	duration?: string; // human label (e.g., "2 hours 30 min")
	price?: number;
	location?: string;
	tags?: string[];
	heroImage?: string | null;
	galleryImages?: string[];
	itinerary?: ImportedItineraryStep[];
	meeting?: {
		address?: string;
		city?: string;
		country?: string;
		latitude?: number | null;
		longitude?: number | null;
	};
	countryId?: string;
	stateId?: string;
	cityId?: string;
	sessions?: ImportedSession[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, field: string): string | undefined {
	if (value == null) return undefined;
	if (typeof value === "string") return value;
	throw new Error(`${field} must be a string`);
}

function asNumber(value: unknown, field: string): number | undefined {
	if (value == null) return undefined;
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) return Number(value);
	throw new Error(`${field} must be a number`);
}

function parseImportedExperience(input: unknown): ImportedExperienceJson {
	if (!isRecord(input)) throw new Error("Root must be an object");

	const title = asString(input.title, "title");
	if (!title) throw new Error("title is required");

	const summary = asString(input.summary, "summary");
	const description = asString(input.description, "description");
	const category = asString(input.category, "category");
	const categoryId = asString(input.categoryId, "categoryId");
	const duration = asString(input.duration, "duration");
	const price = asNumber(input.price, "price");
	const location = asString(input.location, "location");
	const heroImage = input.heroImage == null ? undefined : asString(input.heroImage, "heroImage");

	let tags: string[] | undefined;
	if (input.tags != null) {
		if (!Array.isArray(input.tags)) throw new Error("tags must be an array of strings");
		tags = input.tags.map((t, i) => {
			if (typeof t !== "string") throw new Error(`tags[${i}] must be a string`);
			return t;
		});
	}

	let galleryImages: string[] | undefined;
	if (input.galleryImages != null) {
		if (!Array.isArray(input.galleryImages)) throw new Error("galleryImages must be an array of strings");
		galleryImages = input.galleryImages.map((u, i) => {
			if (typeof u !== "string") throw new Error(`galleryImages[${i}] must be a string URL`);
			return u;
		});
	}

	let itinerary: ImportedItineraryStep[] | undefined;
	if (input.itinerary != null) {
		if (!Array.isArray(input.itinerary)) throw new Error("itinerary must be an array");
		itinerary = input.itinerary.map((s, i) => {
			if (!isRecord(s)) throw new Error(`itinerary[${i}] must be an object`);
			const title = asString(s.title, `itinerary[${i}].title`);
			if (!title) throw new Error(`itinerary[${i}].title is required`);
			const image = asString(s.image, `itinerary[${i}].image`);
			if (!image) throw new Error(`itinerary[${i}].image is required`);
			const step: ImportedItineraryStep = {
				id: asString(s.id, `itinerary[${i}].id`),
				order: s.order == null ? undefined : asNumber(s.order, `itinerary[${i}].order`),
				title,
				subtitle: asString(s.subtitle, `itinerary[${i}].subtitle`),
				image,
				duration: asString(s.duration, `itinerary[${i}].duration`),
			};
			return step;
		});
	}

	let meeting: ImportedExperienceJson["meeting"] | undefined;
	if (input.meeting != null) {
		if (!isRecord(input.meeting)) throw new Error("meeting must be an object");
		meeting = {
			address: asString(input.meeting.address, "meeting.address"),
			city: asString(input.meeting.city, "meeting.city"),
			country: asString(input.meeting.country, "meeting.country"),
			latitude: asNumber(input.meeting.latitude, "meeting.latitude"),
			longitude: asNumber(input.meeting.longitude, "meeting.longitude"),
		};
	}

	let sessions: ImportedSession[] | undefined;
	if (input.sessions != null) {
		if (!Array.isArray(input.sessions)) throw new Error("sessions must be an array");
		sessions = input.sessions.map((s, i) => {
			if (!isRecord(s)) throw new Error(`sessions[${i}] must be an object`);
			const startAt = asString(s.startAt, `sessions[${i}].startAt`);
			if (!startAt || Number.isNaN(new Date(startAt).getTime())) throw new Error(`sessions[${i}].startAt must be a valid date string`);
			const capacity = asNumber(s.capacity, `sessions[${i}].capacity`);
			if (typeof capacity !== "number") throw new Error(`sessions[${i}].capacity is required`);
			const session: ImportedSession = {
				id: asString(s.id, `sessions[${i}].id`),
				startAt,
				duration: asString(s.duration, `sessions[${i}].duration`),
				capacity,
				priceOverride: asNumber(s.priceOverride, `sessions[${i}].priceOverride`),
				locationLabel: asString(s.locationLabel, `sessions[${i}].locationLabel`),
				meetingAddress: asString(s.meetingAddress, `sessions[${i}].meetingAddress`),
				meetingLatitude: asNumber(s.meetingLatitude, `sessions[${i}].meetingLatitude`),
				meetingLongitude: asNumber(s.meetingLongitude, `sessions[${i}].meetingLongitude`),
				useDifferentLocation: ((): boolean | undefined => {
					const v = (s as Record<string, unknown>).useDifferentLocation;
					if (v == null) return undefined;
					if (typeof v === "boolean") return v;
					throw new Error(`sessions[${i}].useDifferentLocation must be a boolean`);
				})(),
				reservedGuests: ((): number | undefined => {
					const v = (s as Record<string, unknown>).reservedGuests;
					if (v == null) return undefined;
					return asNumber(v, `sessions[${i}].reservedGuests`);
				})(),
			};
			return session;
		});
	}

	return {
		title,
		summary,
		description,
		category,
		categoryId,
		duration,
		price,
		location,
		tags,
		heroImage: heroImage ?? null,
		galleryImages,
		itinerary,
		meeting,
		countryId: asString(input.countryId, "countryId"),
		stateId: asString(input.stateId, "stateId"),
		cityId: asString(input.cityId, "cityId"),
		sessions,
	};
}

export function ImportExperienceModal() {
	const router = useRouter();
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [open, setOpen] = useState(false);
	const [mounted, setMounted] = useState(false);
	const [categories, setCategories] = useState<CategoryOption[] | null>(null);
	const [countries, setCountries] = useState<LocationCountry[] | null>(null);
	const [currency, setCurrency] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [initialData, setInitialData] = useState<Record<string, unknown> | null>(null);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setOpen(false);
			}
		}

		if (open) {
			document.addEventListener("keydown", handleKeyDown);
			document.body.classList.add("overflow-hidden");
		}

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.body.classList.remove("overflow-hidden");
		};
	}, [open]);

	const handleClose = useCallback(() => {
		setOpen(false);
		setError(null);
	}, []);

	const handleSuccess = useCallback(
		(slug?: string) => {
			setOpen(false);
			if (slug) {
				router.push(`/experiences/${slug}`);
			} else {
				router.refresh();
			}
		},
		[router]
	);

	useEffect(() => {
		if (!open) return;
		let aborted = false;
		async function loadTaxonomy() {
			setLoading(true);
			setError(null);
			try {
				const [catRes, locRes, curRes] = await Promise.all([
					fetch("/api/taxonomy/categories", { cache: "no-store" }),
					fetch("/api/taxonomy/locations", { cache: "no-store" }),
					fetch("/api/me/currency", { cache: "no-store" }),
				]);
				if (!catRes.ok) throw new Error("Failed to load categories");
				if (!locRes.ok) throw new Error("Failed to load locations");
				if (!curRes.ok) throw new Error("Failed to load currency");
				const catData = (await catRes.json()) as { categories: CategoryOption[] };
				const locData = (await locRes.json()) as { countries: LocationCountry[] };
				const curData = (await curRes.json()) as CurrencyResponse;
				if (aborted) return;
				setCategories(catData.categories);
				setCountries(locData.countries);
				setCurrency(curData.currency);
			} catch (cause) {
				if (aborted) return;
				setError(cause instanceof Error ? cause.message : "Failed to load data");
			} finally {
				if (!aborted) setLoading(false);
			}
		}
		loadTaxonomy();
		return () => {
			aborted = true;
		};
	}, [open]);

	const generateId = () => {
		const uuid = globalThis?.crypto && typeof globalThis.crypto.randomUUID === "function" ? globalThis.crypto.randomUUID() : null;
		return uuid ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
	};

	const initialDataResolved = useMemo(() => {
		if (!initialData) return null;
		const data = initialData as ImportedExperienceJson;
		const resolvedCategoryId = (() => {
			if (data.categoryId) return data.categoryId;
			if (data.category && categories) {
				const found = categories.find((c) => c.name.toLowerCase() === data.category!.toLowerCase());
				return found?.id;
			}
			return undefined;
		})();

		const itinerary = (data.itinerary ?? []).map((step, index) => ({
			id: step.id || generateId(),
			title: step.title,
			subtitle: step.subtitle ?? null,
			image: step.image,
			order: typeof step.order === "number" ? step.order : index,
		}));

		const sessions = (data.sessions ?? []).map((s) => ({
			id: s.id || generateId(),
			startAt: s.startAt,
			duration: s.duration ?? null,
			capacity: s.capacity,
			priceOverride: s.priceOverride ?? null,
			locationLabel: s.locationLabel ?? null,
			meetingAddress: s.meetingAddress ?? null,
			meetingLatitude: s.meetingLatitude ?? null,
			meetingLongitude: s.meetingLongitude ?? null,
			useDifferentLocation: s.useDifferentLocation ?? false,
			reservedGuests: s.reservedGuests,
		}));

		return {
			title: data.title,
			summary: data.summary ?? "",
			description: data.description ?? "",
			category: data.category ?? "general",
			categoryId: resolvedCategoryId,
			duration: data.duration,
			price: data.price,
			location: data.location ?? "",
			tags: data.tags ?? [],
			heroImage: data.heroImage ?? null,
			galleryImages: data.galleryImages ?? [],
			itinerary,
			meeting: data.meeting,
			countryId: data.countryId,
			stateId: data.stateId,
			cityId: data.cityId,
			sessions,
		};
	}, [initialData, categories]);

	const onTriggerClick = useCallback(() => {
		if (!fileInputRef.current) return;
		fileInputRef.current.value = "";
		fileInputRef.current.click();
	}, []);

	const onFileSelected: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (file.type !== "application/json" && !file.name.toLowerCase().endsWith(".json")) {
			setOpen(true);
			setError("Please select a valid JSON file");
			return;
		}
		try {
			setOpen(true);
			setLoading(true);
			setError(null);
			const text = await file.text();
			const raw = JSON.parse(text);
			const parsed = parseImportedExperience(raw);
			setInitialData(parsed as unknown as Record<string, unknown>);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Invalid JSON file");
		} finally {
			setLoading(false);
		}
	};

	const modalContent =
		!mounted || !open
			? null
			: createPortal(
					<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 py-10" role="dialog" aria-modal="true">
						<div className="relative h-full max-h-[90vh] w-full max-w-7xl overflow-hidden rounded-2xl border border-border/70 bg-background shadow-2xl">
							{error ? (
								<div className="flex h-full items-center justify-center p-8">
									<p className="text-sm text-destructive">{error}</p>
								</div>
							) : loading || !categories || !countries || !initialDataResolved ? (
								<div className="flex h-full items-center justify-center p-8">
									<BalloonLoading sizeClassName="w-20" label="Loading" />
								</div>
							) : (
								<ExperienceWizard
									mode="create"
									categories={categories}
									countries={countries}
									currency={currency ?? undefined}
									onClose={handleClose}
									onSuccess={handleSuccess}
									initialData={initialDataResolved}
								/>
							)}
						</div>
					</div>,
					document.body
			  );

	const handleDownloadTemplate = useCallback(() => {
		const template: ImportedExperienceJson = {
			title: "Sunset Kayaking Tour",
			summary: "Paddle through calm waters and enjoy a stunning sunset.",
			description:
				"Join us for a guided kayaking experience suitable for beginners and enthusiasts alike. We'll explore the bay, learn basics, and relax as the sun sets.",
			category: "adventure",
			duration: "2 hours",
			price: 45,
			location: "San Francisco, CA",
			tags: ["outdoor", "water", "sunset"],
			heroImage: "/images/placeholder-experience.svg",
			galleryImages: ["/images/placeholder-experience.svg"],
			itinerary: [
				{ title: "Meet & Greet", subtitle: "Safety briefing and equipment fitting", image: "/images/placeholder-experience.svg", order: 0, duration: "15 min" },
				{
					title: "Paddle Out",
					subtitle: "Learn strokes and explore the shoreline",
					image: "/images/placeholder-experience.svg",
					order: 1,
					duration: "1 hour 15 min",
				},
				{
					title: "Sunset & Return",
					subtitle: "Relax, take photos, and paddle back",
					image: "/images/placeholder-experience.svg",
					order: 2,
					duration: "30 min",
				},
			],
			meeting: { address: "Pier 39", city: "San Francisco", country: "United States", latitude: 37.8087, longitude: -122.4098 },
			sessions: [{ startAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), capacity: 10, priceOverride: null }],
		};

		const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "experience-template.json";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}, []);

	return (
		<>
			<input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={onFileSelected} />
			<span className="inline-flex items-center gap-2">
				<CtaButton color="whiteBorder" onClick={onTriggerClick}>
					Import experience
				</CtaButton>
				<CtaIconButton color="whiteBorder" ariaLabel="Download JSON template" onClick={handleDownloadTemplate}>
					<Download />
				</CtaIconButton>
			</span>
			{modalContent}
		</>
	);
}

export default ImportExperienceModal;
