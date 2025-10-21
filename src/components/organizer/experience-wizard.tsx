"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type MutableRefObject } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormControl, FormDescription, FormField, FormInput, FormLabel, FormSelect, FormTextarea } from "@/components/ui/form";
import { DurationSelector } from "@/components/ui/duration-selector";
import { MiniMap } from "@/components/ui/mini-map";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { UploadSinglePicture } from "@/components/ui/upload-single-picture";
import { UploadMultiplePictures } from "@/components/ui/upload-multiple-pictures";
import { MapLatLng } from "@/components/ui/map-latlng";
import { Calendar as CalendarIcon, ChevronDown, ChevronRight, Trash, Clock, MapPin } from "lucide-react";
import { Stepper } from "@/components/ui/stepper";
import { format } from "date-fns";
import { InputField } from "@/components/ui/input-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { RadioGroupField } from "@/components/ui/radio-group-field";
import { SelectField } from "@/components/ui/select-field";
import { TagsInput } from "@/components/ui/tags-input";
import { PriceInput } from "@/components/ui/price-input";

type Mode = "create" | "edit";

type ImageItem = {
	id: string;
	status: "existing" | "new";
	url?: string;
	file?: File;
	preview?: string;
	removed?: boolean;
};

type ItineraryItem = {
	id: string;
	status: "existing" | "new";
	title: string;
	subtitle: string;
	url?: string;
	file?: File;
	preview?: string;
	removed?: boolean;
	// per-activity duration (hours/minutes only)
	durationHours?: string;
	durationMinutes?: string;
};

type SessionItem = {
	id: string;
	status: "existing" | "new";
	startAt: string;
	capacity: string;
	priceOverride: string;
	useDifferentPrice?: boolean;
	meetingAddress: string;
	meetingLatitude?: string;
	meetingLongitude?: string;
	useDifferentLocation?: boolean;
	useDifferentDuration?: boolean;
	durationDays?: string;
	durationHours?: string;
	durationMinutes?: string;
	reservedGuests?: number;
};

export type ExperienceWizardInitialData = {
	id?: string;
	title?: string;
	summary?: string;
	description?: string | null;
	category?: string;
	categoryId?: string | null;
	audience?: "all" | "men" | "women" | "kids";
	countryId?: string | null;
	stateId?: string | null;
	cityId?: string | null;
	duration?: string | null;
	price?: number;
	currency?: string | null;
	tags?: string[];
	location?: string;
	heroImage?: string | null;
	galleryImages?: string[];
	itinerary?: {
		id: string;
		title: string;
		subtitle: string | null;
		image: string;
		order: number;
	}[];
	meeting?: {
		address?: string | null;
		city?: string | null;
		country?: string | null;
		latitude?: number | null;
		longitude?: number | null;
	};
	sessions?: {
		id: string;
		startAt: string;
		duration?: string | null;
		capacity: number;
		priceOverride: number | null;
		locationLabel?: string | null;
		meetingAddress?: string | null;
		meetingLatitude?: number | null;
		meetingLongitude?: number | null;
		useDifferentLocation?: boolean;
		reservedGuests?: number;
	}[];
};

type ExperienceWizardProps = {
	mode: Mode;
	categories: {
		id: string;
		name: string;
	}[];
	countries: {
		id: string;
		name: string;
		states: {
			id: string;
			name: string;
			cities: {
				id: string;
				name: string;
				latitude?: number;
				longitude?: number;
			}[];
		}[];
		cities: {
			id: string;
			name: string;
			latitude?: number;
			longitude?: number;
		}[];
	}[];
	initialData?: ExperienceWizardInitialData;
	experienceId?: string;
	onClose?: () => void;
	onSuccess?: (slug?: string) => void;
	currency?: string;
	initialStep?: number;
	verificationStep?: {
		enabled: boolean;
		onApprove: () => void | Promise<void>;
		onReject: (note: string) => void | Promise<void>;
	};
	// When true, an introductory Organizer step is inserted at the beginning
	// with extra fields for the applicant and terms acceptance.
	organizerIntro?: boolean;
	// Selects which API to submit to on final action.
	submissionMode?: "create-experience" | "organizer-request";
};

// currency is derived from the organizer's account on the server

const MAX_GALLERY_ITEMS = 15;
const MAX_SESSIONS = 20;

const stepsBase = [
	{ title: "Basic info", description: "Name your experience and set the essentials." },
	{ title: "Visuals", description: "Upload a hero image and supporting gallery." },
	{ title: "Planning", description: "Outline each moment with imagery and captions." },
	{ title: "Meeting point", description: "Let guests know where to arrive." },
	{ title: "Sessions", description: "Schedule upcoming dates and capacities." },
];

function createId() {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function revokeObjectUrl(ref: MutableRefObject<string | null>) {
	const url = ref.current;
	if (url) {
		URL.revokeObjectURL(url);
		ref.current = null;
	}
}

function revokeObjectUrlList(ref: MutableRefObject<string[]>) {
	if (!ref.current.length) return;
	ref.current.forEach((url) => URL.revokeObjectURL(url));
	ref.current = [];
}

type WizardState = {
	title: string;
	summary: string;
	description: string;
	category: string;
	categoryId: string;
	// duration is entered via structured fields below, and formatted on submit
	duration: string;
	durationDays: string;
	durationHours: string;
	durationMinutes: string;
	price: string;
	location: string;
	tags: string[];
	tagInput: string;
	hero: {
		url: string | null;
		file: File | null;
		preview: string | null;
		removed: boolean;
	};
	gallery: ImageItem[];
	itinerary: ItineraryItem[];
	meeting: {
		address: string;
		city: string;
		country: string;
		latitude: string;
		longitude: string;
		countryId: string;
		stateId: string;
		cityId: string;
	};
	sessions: SessionItem[];
	audience: "all" | "men" | "women" | "kids";
	// Organizer intro fields (only used when organizerIntro is enabled)
	organizerAboutSelf?: string;
	organizerAboutExperience?: string;
	organizerTermsAccepted?: boolean;
};

function createInitialState(initial?: ExperienceWizardInitialData): WizardState {
	return {
		title: initial?.title ?? "",
		summary: initial?.summary ?? "",
		description: initial?.description ?? "",
		category: initial?.category ?? "general",
		categoryId: initial?.categoryId ?? "",
		duration: initial?.duration ?? "",
		...parseDurationLabel(initial?.duration ?? ""),
		price: initial?.price ? String(initial.price) : "0",
		location: initial?.location ?? "",
		tags: initial?.tags ?? [],
		tagInput: "",
		hero: {
			url: initial?.heroImage ?? null,
			file: null,
			preview: initial?.heroImage ?? null,
			removed: false,
		},
		gallery: (initial?.galleryImages ?? []).map((url) => ({ id: url, status: "existing", url })),
		itinerary: (initial?.itinerary ?? [])
			.sort((a, b) => a.order - b.order)
			.map((step) => ({
				id: step.id,
				status: "existing",
				title: step.title,
				subtitle: step.subtitle ?? "",
				url: step.image,
				// initialise from persisted label if available
				durationHours: (() => {
					const label = (step as unknown as { duration?: string }).duration;
					if (!label) return "0";
					const m = label.match(/(\d+)\s*hour/);
					const h = m ? Number.parseInt(m[1], 10) || 0 : 0;
					return String(Math.max(0, Math.min(23, h)));
				})(),
				durationMinutes: (() => {
					const label = (step as unknown as { duration?: string }).duration;
					if (!label) return "0";
					const m = label.match(/(\d+)\s*min/);
					let v = m ? Number.parseInt(m[1], 10) || 0 : 0;
					v = v - (v % 5);
					return String(Math.max(0, Math.min(55, v)));
				})(),
			})),
		meeting: {
			address: initial?.meeting?.address ?? "",
			city: initial?.meeting?.city ?? "",
			country: initial?.meeting?.country ?? "",
			latitude: initial?.meeting?.latitude ? String(initial.meeting.latitude) : "",
			longitude: initial?.meeting?.longitude ? String(initial.meeting.longitude) : "",
			countryId: initial?.countryId ?? "",
			stateId: initial?.stateId ?? "",
			cityId: initial?.cityId ?? "",
		},
		sessions: (initial?.sessions ?? []).map((session) => ({
			id: session.id,
			status: "existing",
			startAt: session.startAt.slice(0, 16),
			capacity: String(session.capacity),
			priceOverride: session.priceOverride != null ? String(session.priceOverride) : "",
			useDifferentPrice: session.priceOverride != null,
			meetingAddress: session.meetingAddress ?? "",
			meetingLatitude: session.meetingLatitude != null ? String(session.meetingLatitude) : "",
			meetingLongitude: session.meetingLongitude != null ? String(session.meetingLongitude) : "",
			useDifferentLocation: session.useDifferentLocation ?? false,
			useDifferentDuration: Boolean(session.duration && session.duration.trim()),
			...parseDurationLabel(session.duration ?? ""),
			reservedGuests:
				typeof (session as unknown as { reservedGuests?: unknown }).reservedGuests === "number"
					? ((session as unknown as { reservedGuests?: number }).reservedGuests as number)
					: 0,
		})),
		audience: initial?.audience ?? "all",
	};
}

function parseDurationLabel(label: string): { durationDays: string; durationHours: string; durationMinutes: string } {
	const result = { durationDays: "0", durationHours: "0", durationMinutes: "0" };
	if (!label) return result;
	try {
		const parts = label.toLowerCase().split(/\s+/);
		for (let i = 0; i < parts.length; i++) {
			const value = Number.parseInt(parts[i] || "", 10);
			if (Number.isNaN(value)) continue;
			const unit = parts[i + 1] || "";
			if (unit.startsWith("day")) {
				result.durationDays = String(Math.max(0, Math.min(7, value)));
			} else if (unit.startsWith("hour")) {
				result.durationHours = String(Math.max(0, Math.min(23, value)));
			} else if (unit.startsWith("min")) {
				const m = value - (value % 5);
				result.durationMinutes = String(Math.max(0, Math.min(55, m)));
			}
		}
		return result;
	} catch {
		return result;
	}
}

export function ExperienceWizard({
	mode,
	categories,
	countries,
	initialData,
	experienceId,
	onClose,
	onSuccess,
	currency,
	initialStep,
	verificationStep,
	organizerIntro = false,
	submissionMode = "create-experience",
}: ExperienceWizardProps) {
	const router = useRouter();
	const [state, setState] = useState<WizardState>(() => createInitialState(initialData));
	const steps = useMemo(() => {
		const base = organizerIntro ? [{ title: "Organizer", description: "Tell us about you and agree to host terms." }, ...stepsBase] : stepsBase;
		return verificationStep?.enabled ? [...base, { title: "Verification", description: "Approve or reject this experience for publishing." }] : base;
	}, [organizerIntro, verificationStep?.enabled]);
	const initialStepNormalized = Math.max(0, Math.min(steps.length - 1, initialStep ?? 0));
	const [currentStep, setCurrentStep] = useState(initialStepNormalized);
	const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});
	const [pending, startTransition] = useTransition();
	const heroObjectUrl = useRef<string | null>(null);
	const galleryObjectUrls = useRef<string[]>([]);
	const itineraryObjectUrls = useRef<string[]>([]);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const totalSteps = steps.length;
	const galleryCount = useMemo(() => state.gallery.filter((item) => !item.removed).length, [state.gallery]);
	const progressSteps = useMemo(
		() =>
			steps.map((step, index) => ({
				...step,
				status: index < currentStep ? "complete" : index === currentStep ? "current" : "upcoming",
				index,
			})),
		[currentStep]
	);
	const [verifyNote, setVerifyNote] = useState<string>("");

	useEffect(() => {
		return () => {
			revokeObjectUrl(heroObjectUrl);
			revokeObjectUrlList(galleryObjectUrls);
			revokeObjectUrlList(itineraryObjectUrls);
		};
	}, []);

	useEffect(() => {
		setState(createInitialState(initialData));
	}, [initialData]);

	useEffect(() => {
		// Ensure newly added sessions are expanded by default and cleanup removed ids
		setExpandedSessions((prev) => {
			const next: Record<string, boolean> = { ...prev };
			let changed = false;
			const ids = new Set(state.sessions.map((s) => s.id));
			for (const s of state.sessions) {
				if (!(s.id in next)) {
					next[s.id] = false;
					changed = true;
				}
			}
			for (const id of Object.keys(next)) {
				if (!ids.has(id)) {
					delete next[id];
					changed = true;
				}
			}
			return changed ? next : prev;
		});
	}, [state.sessions]);

	useEffect(() => {
		setState((prev) => {
			const next = { ...prev };
			if (next.sessions.length === 0) {
				const now = new Date();
				const startAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
				next.sessions = [
					{
						id: createId(),
						status: "new",
						startAt,
						capacity: "10",
						priceOverride: "",
						meetingAddress: "",
						meetingLatitude: "",
						meetingLongitude: "",
						useDifferentLocation: false,
						useDifferentDuration: false,
						durationDays: prev.durationDays,
						durationHours: prev.durationHours,
						durationMinutes: prev.durationMinutes,
					},
				];
			}
			if (next.itinerary.length === 0) {
				next.itinerary = [
					{
						id: createId(),
						status: "new",
						title: "",
						subtitle: "",
					},
				];
			}
			return next;
		});
	}, []);

	const canProceedStep1 = useMemo(() => {
		const titleOk = Boolean(state.title.trim());
		const summaryOk = Boolean(state.summary.trim());
		const descriptionLength = state.description.trim().length;
		const descriptionOk = descriptionLength >= 200 && descriptionLength <= 1000;
		const categoryOk = Boolean(state.categoryId);
		const priceOk = Boolean(state.price.trim());
		const days = Math.max(0, Math.min(7, Number.parseInt(state.durationDays || "0", 10)));
		const hours = Math.max(0, Math.min(23, Number.parseInt(state.durationHours || "0", 10)));
		const minutes = Math.max(0, Math.min(55, Number.parseInt(state.durationMinutes || "0", 10)));
		const minutesValid = minutes % 5 === 0;
		const someDuration = days + hours + minutes > 0;
		return titleOk && summaryOk && descriptionOk && categoryOk && priceOk && someDuration && minutesValid;
	}, [state.categoryId, state.description, state.durationDays, state.durationHours, state.durationMinutes, state.price, state.summary, state.title]);

	const canProceedStep2 = useMemo(() => {
		return Boolean(state.hero.preview) && galleryCount >= 5;
	}, [galleryCount, state.hero.preview]);

	const canProceedStep3 = useMemo(() => {
		const active = state.itinerary.filter((step) => !step.removed);
		if (!active.length) {
			return false;
		}
		return active.every((step) => Boolean(step.title.trim()));
	}, [state.itinerary]);

	const canProceedStep5 = useMemo(() => {
		return state.sessions.every((session) => session.startAt && session.capacity);
	}, [state.sessions]);

	const sessionsSorted = useMemo(() => {
		return [...state.sessions].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
	}, [state.sessions]);

	// disabledNext is computed after meeting-point validation is derived (see below)

	const handleBasicFieldChange = (key: keyof WizardState, value: string) => {
		setState((prev) => ({
			...prev,
			[key]: value,
		}));
	};

	function sanitisePriceInput(raw: string): string {
		// Remove any non-digits
		const digitsOnly = raw.replace(/\D+/g, "");
		if (!digitsOnly) return "";
		let num = Number.parseInt(digitsOnly, 10);
		if (Number.isNaN(num)) return "";
		num = Math.max(0, Math.min(10000, num));
		return String(num);
	}

	const addTag = useCallback((value: string) => {
		const normalised = value.toLowerCase();
		setState((prev) => {
			if (prev.tags.includes(normalised)) {
				return { ...prev, tagInput: "" };
			}
			return {
				...prev,
				tags: [...prev.tags, normalised],
				tagInput: "",
			};
		});
	}, []);

	const addTags = useCallback((values: string[]) => {
		const normalised = values.map((v) => v.toLowerCase().trim()).filter(Boolean);
		if (!normalised.length) return;
		setState((prev) => {
			const existing = new Set(prev.tags);
			const toAdd = normalised.filter((t) => !existing.has(t));
			if (!toAdd.length) return { ...prev, tagInput: "" };
			return { ...prev, tags: [...prev.tags, ...toAdd], tagInput: "" };
		});
	}, []);

	const removeTag = useCallback((target: string) => {
		setState((prev) => ({
			...prev,
			tags: prev.tags.filter((tag) => tag !== target),
		}));
	}, []);

	const handleTagKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter" && state.tagInput.trim()) {
			event.preventDefault();
			addTags([state.tagInput.trim()]);
		}
		if (event.key === "Backspace" && !state.tagInput && state.tags.length) {
			removeTag(state.tags[state.tags.length - 1]);
		}
	};

	const handleHeroChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;
		if (heroObjectUrl.current) {
			URL.revokeObjectURL(heroObjectUrl.current);
		}
		const preview = URL.createObjectURL(file);
		heroObjectUrl.current = preview;
		setState((prev) => ({
			...prev,
			hero: {
				url: prev.hero.url,
				file,
				preview,
				removed: false,
			},
		}));
	};

	const removeHero = () => {
		if (heroObjectUrl.current) {
			URL.revokeObjectURL(heroObjectUrl.current);
			heroObjectUrl.current = null;
		}
		setState((prev) => ({
			...prev,
			hero: {
				url: prev.hero.url,
				file: null,
				preview: null,
				removed: true,
			},
		}));
	};

	const handleGallerySelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(event.target.files ?? []);
		if (!files.length) return;

		const existingCount = state.gallery.filter((item) => !item.removed).length;
		let remaining = MAX_GALLERY_ITEMS - existingCount;

		if (remaining <= 0) {
			setError(`You can upload up to ${MAX_GALLERY_ITEMS} gallery images.`);
			event.target.value = "";
			return;
		}

		const additions: ImageItem[] = [];

		files.forEach((file) => {
			if (remaining <= 0) {
				return;
			}
			const preview = URL.createObjectURL(file);
			galleryObjectUrls.current.push(preview);
			additions.push({ id: createId(), status: "new", file, preview });
			remaining -= 1;
		});

		if (!additions.length) {
			event.target.value = "";
			return;
		}

		setError(null);
		setState((prev) => ({ ...prev, gallery: [...prev.gallery, ...additions] }));

		event.target.value = "";
	};

	const removeGalleryItem = (id: string) => {
		setState((prev) => ({
			...prev,
			gallery: prev.gallery
				.map((item) => {
					if (item.id !== id) return item;
					if (item.status === "new") {
						if (item.preview) {
							URL.revokeObjectURL(item.preview);
							galleryObjectUrls.current = galleryObjectUrls.current.filter((url) => url !== item.preview);
						}
						return { ...item, removed: true };
					}
					return { ...item, removed: true };
				})
				.filter((item) => !(item.status === "new" && item.removed)),
		}));
	};

	const handleItineraryAdd = () => {
		setState((prev) => ({
			...prev,
			itinerary: [
				...prev.itinerary,
				{
					id: createId(),
					status: "new",
					title: "",
					subtitle: "",
					durationHours: "0",
					durationMinutes: "0",
				},
			],
		}));
	};

	const handleItineraryImageChange = (id: string, file: File) => {
		const preview = URL.createObjectURL(file);
		itineraryObjectUrls.current.push(preview);
		setState((prev) => ({
			...prev,
			itinerary: prev.itinerary.map((item) =>
				item.id === id
					? {
							...item,
							file,
							preview,
					  }
					: item
			),
		}));
	};

	const removeItineraryImage = (id: string) => {
		setState((prev) => ({
			...prev,
			itinerary: prev.itinerary.map((item) => {
				if (item.id !== id) return item;
				if (item.preview) {
					URL.revokeObjectURL(item.preview);
					itineraryObjectUrls.current = itineraryObjectUrls.current.filter((url) => url !== item.preview);
				}
				return { ...item, file: undefined, preview: undefined, url: undefined };
			}),
		}));
	};

	const removeItineraryStep = (id: string) => {
		setState((prev) => ({
			...prev,
			itinerary: prev.itinerary
				.map((item) =>
					item.id === id
						? {
								...item,
								removed: item.status === "existing",
						  }
						: item
				)
				.filter((item) => !(item.status === "new" && !item.url && !item.file && item.id === id)),
		}));
	};

	const updateItineraryField = (id: string, key: "title" | "subtitle" | "durationHours" | "durationMinutes", value: string) => {
		setState((prev) => ({
			...prev,
			itinerary: prev.itinerary.map((item) =>
				item.id === id
					? {
							...item,
							[key]: value,
					  }
					: item
			),
		}));
	};

	const handleSessionAdd = () => {
		// Enforce sessions limit
		if (state.sessions.length >= MAX_SESSIONS) {
			setError(`You can schedule up to ${MAX_SESSIONS} sessions per experience.`);
			return;
		}
		const now = new Date();
		const startAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
		const newId = createId();
		setState((prev) => ({
			...prev,
			sessions: [
				...prev.sessions,
				{
					id: newId,
					status: "new",
					startAt,
					capacity: "10",
					priceOverride: "",
					useDifferentPrice: false,
					meetingAddress: "",
					meetingLatitude: "",
					meetingLongitude: "",
					useDifferentLocation: false,
					useDifferentDuration: false,
					durationDays: prev.durationDays,
					durationHours: prev.durationHours,
					durationMinutes: prev.durationMinutes,
				},
			],
		}));

		queueScrollToSession(newId);
	};

	const removeSession = (id: string) => {
		setState((prev) => {
			const target = prev.sessions.find((s) => s.id === id);
			const reserved = target ? Math.max(0, Number.parseInt(String(target.reservedGuests ?? 0), 10) || 0) : 0;
			if (reserved > 0) {
				return { ...prev }; // No-op; server also enforces
			}
			return {
				...prev,
				sessions: prev.sessions.filter((session) => session.id !== id),
			};
		});
	};

	const updateSessionField = (
		id: string,
		key:
			| "startAt"
			| "capacity"
			| "priceOverride"
			| "meetingAddress"
			| "meetingLatitude"
			| "meetingLongitude"
			| "durationDays"
			| "durationHours"
			| "durationMinutes",
		value: string
	) => {
		setState((prev) => ({
			...prev,
			sessions: prev.sessions.map((session) =>
				session.id === id
					? {
							...session,
							[key]: value,
					  }
					: session
			),
		}));
	};

	function toggleSessionDifferentLocation(id: string) {
		setState((prev) => ({
			...prev,
			sessions: prev.sessions.map((session) => {
				if (session.id !== id) return session;
				const next = !Boolean(session.useDifferentLocation);
				const shouldInit =
					next && (!session.meetingLatitude || !session.meetingLatitude.trim() || !session.meetingLongitude || !session.meetingLongitude.trim());
				return {
					...session,
					useDifferentLocation: next,
					meetingLatitude: shouldInit && prev.meeting.latitude ? prev.meeting.latitude : session.meetingLatitude ?? "",
					meetingLongitude: shouldInit && prev.meeting.longitude ? prev.meeting.longitude : session.meetingLongitude ?? "",
				};
			}),
		}));
	}

	function toggleSessionDifferentPrice(id: string) {
		setState((prev) => ({
			...prev,
			sessions: prev.sessions.map((session) => {
				if (session.id !== id) return session;
				const next = !Boolean(session.useDifferentPrice);
				return {
					...session,
					useDifferentPrice: next,
					priceOverride: next ? session.priceOverride : "",
				};
			}),
		}));
	}

	function toggleSessionDifferentDuration(id: string) {
		setState((prev) => ({
			...prev,
			sessions: prev.sessions.map((session) => {
				if (session.id !== id) return session;
				const next = !Boolean(session.useDifferentDuration);
				return {
					...session,
					useDifferentDuration: next,
					durationDays: next ? session.durationDays ?? prev.durationDays : session.durationDays,
					durationHours: next ? session.durationHours ?? prev.durationHours : session.durationHours,
					durationMinutes: next ? session.durationMinutes ?? prev.durationMinutes : session.durationMinutes,
				};
			}),
		}));
	}

	function getDatePart(value: string | undefined): string | null {
		if (!value) return null;
		const [date] = value.split("T");
		return date || null;
	}

	function getTimePart(value: string | undefined): string {
		if (!value) return "";
		const parts = value.split("T");
		if (parts.length < 2) return "";
		return parts[1] || "";
	}

	function getSessionTitle(session: SessionItem) {
		// Date label like "Wednesday, October 1"
		let dateLabel = "";
		try {
			const dateOnly = getDatePart(session.startAt) || format(new Date(), "yyyy-MM-dd");
			dateLabel = format(new Date(dateOnly as string), "EEEE, LLLL d");
		} catch {
			dateLabel = getDatePart(session.startAt) || "";
		}
		// Time range "HH:mm to HH:mm"
		const startTime = getTimePart(session.startAt) || "09:00";
		const [startH, startM] = startTime.split(":").map((p) => Number.parseInt(p || "0", 10));
		const baseDate = getDatePart(session.startAt) || format(new Date(), "yyyy-MM-dd");
		const start = new Date(`${baseDate}T${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`);
		const useDifferent = Boolean(session.useDifferentDuration);
		const dDays = useDifferent ? Number.parseInt(session.durationDays || "0", 10) || 0 : Number.parseInt(state.durationDays || "0", 10) || 0;
		const dHours = useDifferent ? Number.parseInt(session.durationHours || "0", 10) || 0 : Number.parseInt(state.durationHours || "0", 10) || 0;
		const dMinutes = useDifferent ? Number.parseInt(session.durationMinutes || "0", 10) || 0 : Number.parseInt(state.durationMinutes || "0", 10) || 0;
		const durationMs = ((dDays * 24 + dHours) * 60 + dMinutes) * 60 * 1000;
		const end = new Date(start.getTime() + durationMs);
		const startLabel = format(start, "HH:mm");
		const endLabel = format(end, "HH:mm");
		return (
			<span className="inline-flex flex-wrap items-center gap-2">
				<span className="inline-flex items-center gap-1">
					<CalendarIcon className="size-4" />
					{dateLabel}
				</span>
				<span className="text-muted-foreground">|</span>
				<span className="inline-flex items-center gap-1">
					<Clock className="size-4" />
					{startLabel} to {endLabel}
				</span>
			</span>
		);
	}

	function getSessionMeta(session: SessionItem) {
		const capacityNum = session.capacity ? Number.parseInt(session.capacity, 10) : 0;
		const capacityLabel = capacityNum ? `${capacityNum} spot${capacityNum === 1 ? "" : "s"}` : "";
		const effective = session.useDifferentPrice && session.priceOverride ? session.priceOverride : state.price;
		const currencyLabel = currency && currency.trim() ? currency : "USD";
		const priceText = effective ? `${effective} ${currencyLabel} / spot` : "";
		return { capacityNum, capacityLabel, priceText };
	}

	function getSessionLocationLabel(session: SessionItem): string {
		const baseAddress = session.useDifferentLocation && session.meetingAddress.trim() ? session.meetingAddress.trim() : (state.meeting.address || "").trim();
		const baseCity = (state.meeting.city || "").trim();
		return [baseAddress, baseCity].filter(Boolean).join(", ");
	}

	function getDurationLabel(session: SessionItem): string {
		const { dDays, dHours, dMinutes } = getEffectiveDuration(session);
		const parts: string[] = [];
		if (dDays) parts.push(`${String(dDays).padStart(2, "0")}d`);
		if (dHours) parts.push(`${String(dHours).padStart(2, "0")}h`);
		parts.push(`${String(dMinutes).padStart(2, "0")}m`);
		return parts.join(" ");
	}

	function getSessionDateParts(session: SessionItem): { weekdayShort: string; dayOfMonth: string; monthShort: string } {
		let weekdayShort = "";
		let dayOfMonth = "";
		let monthShort = "";
		try {
			const dateOnly = getDatePart(session.startAt) || format(new Date(), "yyyy-MM-dd");
			const date = new Date(dateOnly as string);
			weekdayShort = format(date, "EEE");
			dayOfMonth = format(date, "d");
			monthShort = format(date, "LLL");
		} catch {
			weekdayShort = "";
			dayOfMonth = "";
			monthShort = "";
		}
		return { weekdayShort, dayOfMonth, monthShort };
	}

	function getTimeRangeLabel(session: SessionItem): string {
		const baseDate = getDatePart(session.startAt) || format(new Date(), "yyyy-MM-dd");
		const startTime = getTimePart(session.startAt) || "09:00";
		const [startH, startM] = startTime.split(":").map((p) => Number.parseInt(p || "0", 10));
		const start = new Date(`${baseDate}T${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`);
		const end = getSessionEndDate(session);
		return `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`;
	}

	function SessionSummary({ session, expanded }: { session: SessionItem; expanded: boolean }) {
		const { capacityNum, capacityLabel, priceText } = getSessionMeta(session);
		const reserved = Math.max(0, Number.parseInt(String(session.reservedGuests ?? 0), 10) || 0);
		const durationLabel = getDurationLabel(session);
		const locationLabel = getSessionLocationLabel(session);
		const { weekdayShort, dayOfMonth, monthShort } = getSessionDateParts(session);
		const timeRange = getTimeRangeLabel(session);
		return (
			<div className="flex items-center gap-4">
				<div className="flex w-16 flex-col items-center justify-center py-1">
					<span className="text-xs font-semibold text-primary leading-none">{weekdayShort}</span>
					<span className="text-3xl font-semibold text-foreground leading-tight">{dayOfMonth}</span>
					<span className="text-xs text-muted-foreground leading-none">{monthShort}</span>
				</div>
				<div className="hidden h-12 w-px self-stretch bg-border/60 sm:block" />
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2 text-sm">
						<Clock className="size-4 text-muted-foreground" />
						<span className="font-medium text-foreground">{timeRange}</span>
					</div>
					{locationLabel ? (
						<div className="mt-1 text-sm text-muted-foreground inline-flex items-center gap-1">
							<MapPin className="size-4" />
							<span className="truncate">{locationLabel}</span>
						</div>
					) : null}
					{!expanded ? (
						<div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
							<span className="text-muted-foreground">Duration</span>
							<span className="font-semibold text-foreground">{durationLabel}</span>
							<span className="h-3 w-px bg-border/70" aria-hidden />
							<span className="text-muted-foreground">Price</span>
							<span className="font-semibold text-foreground">{priceText || "—"}</span>
							<span className="h-3 w-px bg-border/70" aria-hidden />
							<span className="text-muted-foreground">Spots</span>
							<span className="font-semibold text-foreground">
								{capacityNum ? `${capacityNum}` : "—"}
								{reserved ? ` (${reserved} reserved)` : ""}
							</span>
						</div>
					) : null}
				</div>
			</div>
		);
	}

	function setStartDate(id: string, date: Date) {
		setState((prev) => ({
			...prev,
			sessions: prev.sessions.map((s) => {
				if (s.id !== id) return s;
				const time = getTimePart(s.startAt) || "09:00";
				return { ...s, startAt: `${format(date, "yyyy-MM-dd")}T${time}` };
			}),
		}));
	}

	function setStartTime(id: string, time: string) {
		setState((prev) => ({
			...prev,
			sessions: prev.sessions.map((s) => {
				if (s.id !== id) return s;
				const date = getDatePart(s.startAt) || format(new Date(), "yyyy-MM-dd");
				return { ...s, startAt: `${date}T${time}` };
			}),
		}));
	}

	function getEffectiveDuration(session?: SessionItem) {
		const useDifferent = Boolean(session?.useDifferentDuration);
		const dDays = useDifferent ? Number.parseInt(session?.durationDays || "0", 10) || 0 : Number.parseInt(state.durationDays || "0", 10) || 0;
		const dHours = useDifferent ? Number.parseInt(session?.durationHours || "0", 10) || 0 : Number.parseInt(state.durationHours || "0", 10) || 0;
		const dMinutes = useDifferent ? Number.parseInt(session?.durationMinutes || "0", 10) || 0 : Number.parseInt(state.durationMinutes || "0", 10) || 0;
		return { dDays, dHours, dMinutes };
	}

	function getSessionEndDate(session: SessionItem): Date {
		const dateOnly = getDatePart(session.startAt) || format(new Date(), "yyyy-MM-dd");
		const time = getTimePart(session.startAt) || "09:00";
		const [h, m] = time.split(":").map((p) => Number.parseInt(p || "0", 10));
		const start = new Date(`${dateOnly}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
		const { dDays, dHours, dMinutes } = getEffectiveDuration(session);
		const ms = ((dDays * 24 + dHours) * 60 + dMinutes) * 60 * 1000;
		return new Date(start.getTime() + ms);
	}

	function formatLocalInput(date: Date): string {
		return format(date, "yyyy-MM-dd'T'HH:mm");
	}

	// Smoothly scroll to a session card by id
	function scrollToSessionElement(sessionId: string) {
		if (typeof document === "undefined") return;
		const el = document.getElementById(`session-${sessionId}`);
		if (!el) return;
		try {
			el.scrollIntoView({ behavior: "smooth", block: "center" });
		} catch {
			el.scrollIntoView();
		}
	}

	function queueScrollToSession(sessionId: string) {
		if (typeof requestAnimationFrame === "function") {
			requestAnimationFrame(() => requestAnimationFrame(() => scrollToSessionElement(sessionId)));
		} else {
			setTimeout(() => scrollToSessionElement(sessionId), 0);
		}
	}

	function addSessionAt(date: Date) {
		// Enforce sessions limit
		if (state.sessions.length >= MAX_SESSIONS) {
			setError(`You can schedule up to ${MAX_SESSIONS} sessions per experience.`);
			return;
		}
		const newId = createId();
		setState((prev) => ({
			...prev,
			sessions: [
				...prev.sessions,
				{
					id: newId,
					status: "new",
					startAt: formatLocalInput(date),
					capacity: "10",
					priceOverride: "",
					useDifferentPrice: false,
					meetingAddress: "",
					meetingLatitude: "",
					meetingLongitude: "",
					useDifferentLocation: false,
					useDifferentDuration: false,
					durationDays: prev.durationDays,
					durationHours: prev.durationHours,
					durationMinutes: prev.durationMinutes,
				},
			],
		}));

		// Scroll to the newly added session
		queueScrollToSession(newId);
	}

	function getLastSession(): SessionItem | null {
		if (!state.sessions.length) return null;
		return state.sessions.reduce((latest, s) => (new Date(s.startAt) > new Date(latest.startAt) ? s : latest), state.sessions[0]);
	}

	function toggleSessionExpanded(id: string) {
		setExpandedSessions((prev) => ({ ...prev, [id]: !prev[id] }));
	}

	function getSessionSummary(session: SessionItem): string {
		const datePart = getDatePart(session.startAt);
		let dateLabel = "";
		try {
			dateLabel = datePart ? format(new Date(datePart as string), "LLL dd, yyyy") : "";
		} catch {
			dateLabel = datePart || "";
		}
		const timeLabel = getTimePart(session.startAt) || "";
		const capacityNum = session.capacity ? Number.parseInt(session.capacity, 10) : 0;
		const capacityLabel = capacityNum ? `${capacityNum} spot${capacityNum === 1 ? "" : "s"}` : "";
		const effective = session.useDifferentPrice && session.priceOverride ? session.priceOverride : state.price;
		const priceLabel = effective ? (currency ? `${effective} ${currency}` : effective) : "";
		const datetime = dateLabel || timeLabel ? `${dateLabel}${dateLabel && timeLabel ? " " : ""}${timeLabel}` : "";
		return [datetime, capacityLabel, priceLabel].filter(Boolean).join(" · ");
	}

	const handleSubmit = () => {
		const formData = new FormData();
		formData.append("title", state.title.trim());
		formData.append("summary", state.summary.trim());
		// build duration string from structured inputs
		{
			const d = Math.max(0, Math.min(7, Number.parseInt(state.durationDays || "0", 10)));
			const h = Math.max(0, Math.min(23, Number.parseInt(state.durationHours || "0", 10)));
			let m = Math.max(0, Math.min(55, Number.parseInt(state.durationMinutes || "0", 10)));
			m = m - (m % 5);
			const parts: string[] = [];
			if (d) parts.push(`${d} day${d === 1 ? "" : "s"}`);
			if (h) parts.push(`${h} hour${h === 1 ? "" : "s"}`);
			if (m) parts.push(`${m} min`);
			const durationLabel = parts.join(" ") || "0 min";
			formData.append("duration", durationLabel);
		}
		if (state.description.trim()) formData.append("description", state.description.trim());
		formData.append("audience", state.audience);
		formData.append("price", state.price.trim());
		formData.append("category", state.category);
		if (state.categoryId) formData.append("categoryId", state.categoryId);
		// compute display location from meeting selection (city/state/country)
		{
			const selectedCountryLocal = countries.find((c) => c.id === state.meeting.countryId) || null;
			const selectedStateLocal = selectedCountryLocal?.states.find((s) => s.id === state.meeting.stateId) || null;
			const parts = [state.meeting.city, selectedStateLocal?.name ?? "", state.meeting.country].filter((p) => Boolean(p && p.trim()));
			const displayLocation = parts.join(", ");
			formData.append("location", displayLocation);
		}
		if (state.tags.length) formData.append("tags", state.tags.join(","));

		if (state.hero.file) {
			formData.append("heroImage", state.hero.file);
		}
		if (state.hero.removed && !state.hero.file && mode === "edit") {
			formData.append("removeHero", "true");
		}

		const galleryRemove = state.gallery.filter((item) => item.status === "existing" && item.removed);
		const galleryNew = state.gallery.filter((item) => item.status === "new" && !item.removed);

		if (galleryRemove.length) {
			formData.append("removeGallery", JSON.stringify(galleryRemove.map((item) => item.id)));
		}

		galleryNew.forEach((item) => {
			if (item.file) {
				formData.append("galleryImages", item.file);
			}
		});

		formData.append("meetingAddress", state.meeting.address);
		formData.append("meetingCity", state.meeting.city);
		formData.append("meetingCountry", state.meeting.country);
		if (state.meeting.countryId) formData.append("countryId", state.meeting.countryId);
		if (state.meeting.stateId) formData.append("stateId", state.meeting.stateId);
		if (state.meeting.cityId) formData.append("cityId", state.meeting.cityId);
		formData.append("meetingLatitude", state.meeting.latitude);
		formData.append("meetingLongitude", state.meeting.longitude);

		const itineraryMeta = state.itinerary
			.filter((item) => !item.removed)
			.map((item, index) => {
				const meta: Record<string, unknown> = {
					order: index,
					title: item.title.trim(),
					subtitle: item.subtitle.trim(),
				};
				// include optional per-activity duration label if provided
				{
					const h = Math.max(0, Math.min(23, Number.parseInt(item.durationHours || "0", 10) || 0));
					let m = Math.max(0, Math.min(55, Number.parseInt(item.durationMinutes || "0", 10) || 0));
					m = m - (m % 5);
					const parts: string[] = [];
					if (h) parts.push(`${h} hour${h === 1 ? "" : "s"}`);
					if (m) parts.push(`${m} min`);
					const label = parts.join(" ");
					if (label) (meta as Record<string, unknown>).duration = label;
				}
				if (mode === "edit" && item.status === "existing") meta.id = item.id;
				if (item.file) {
					const key = `itineraryImage-${item.id}`;
					meta.imageKey = key;
					formData.append(key, item.file);
				} else if (item.url) {
					meta.imageUrl = item.url;
				}
				return meta;
			});

		formData.append("itinerary", JSON.stringify(itineraryMeta));

		const sessionsMeta = state.sessions.map((session) => {
			const isDifferent = Boolean(session.useDifferentLocation);
			const hasDifferentPrice = Boolean(session.useDifferentPrice);
			const useDifferentDuration = Boolean(session.useDifferentDuration);
			function buildDurationLabel(daysStr?: string, hoursStr?: string, minutesStr?: string) {
				const d = Math.max(0, Math.min(7, Number.parseInt(daysStr || "0", 10)));
				const h = Math.max(0, Math.min(23, Number.parseInt(hoursStr || "0", 10)));
				let m = Math.max(0, Math.min(55, Number.parseInt(minutesStr || "0", 10)));
				m = m - (m % 5);
				const parts: string[] = [];
				if (d) parts.push(`${d} day${d === 1 ? "" : "s"}`);
				if (h) parts.push(`${h} hour${h === 1 ? "" : "s"}`);
				if (m) parts.push(`${m} min`);
				return parts.join(" ") || "0 min";
			}
			return {
				id: mode === "edit" && session.status === "existing" ? session.id : undefined,
				startAt: new Date(session.startAt).toISOString(),
				duration: useDifferentDuration ? buildDurationLabel(session.durationDays, session.durationHours, session.durationMinutes) : null,
				capacity: Number.parseInt(session.capacity, 10),
				priceOverride: hasDifferentPrice && session.priceOverride ? Number.parseInt(session.priceOverride, 10) : null,
				meetingAddress: isDifferent && session.meetingAddress.trim() ? session.meetingAddress.trim() : null,
				meetingLatitude: isDifferent && session.meetingLatitude && session.meetingLatitude.trim() ? Number.parseFloat(session.meetingLatitude) : null,
				meetingLongitude: isDifferent && session.meetingLongitude && session.meetingLongitude.trim() ? Number.parseFloat(session.meetingLongitude) : null,
			};
		});

		formData.append("sessions", JSON.stringify(sessionsMeta));

		if (mode === "edit" && !experienceId) {
			setError("Experience identifier is missing");
			return;
		}

		let url = mode === "create" ? "/api/experiences" : `/api/organizer/experiences/${experienceId}`;
		let method: "POST" | "PATCH" = mode === "create" ? "POST" : "PATCH";
		if (submissionMode === "organizer-request") {
			url = "/api/organizer/apply";
			method = "POST";
			// include organizer intro fields
			formData.append("organizerAboutSelf", (state.organizerAboutSelf ?? "").trim());
			formData.append("organizerAboutExperience", (state.organizerAboutExperience ?? "").trim());
			formData.append("organizerTermsAccepted", String(Boolean(state.organizerTermsAccepted)));
			// Always store as draft for review
			formData.set("status", "DRAFT");
		}

		startTransition(async () => {
			setError(null);
			setMessage(null);

			const response = await fetch(url, {
				method,
				body: formData,
			});

			if (!response.ok) {
				const data = await response.json().catch(() => ({ message: "Unable to save experience" }));
				setError(data.message ?? "Unable to save experience");
				return;
			}

			const data = await response.json().catch(() => ({}));

			if (mode === "create") {
				const slug = typeof data.slug === "string" ? data.slug : undefined;
				onSuccess?.(slug);
				onClose?.();
				if (!onSuccess && slug) {
					router.push(`/experiences/${slug}`);
				} else if (!onSuccess) {
					router.refresh();
				}
			} else {
				setMessage("Experience updated successfully");
				onSuccess?.();
				router.refresh();
			}
		});
	};

	const handleSaveDraft = () => {
		const formData = new FormData();
		if (state.title.trim()) formData.append("title", state.title.trim());
		if (state.summary.trim()) formData.append("summary", state.summary.trim());
		{
			const d = Math.max(0, Math.min(7, Number.parseInt(state.durationDays || "0", 10)));
			const h = Math.max(0, Math.min(23, Number.parseInt(state.durationHours || "0", 10)));
			let m = Math.max(0, Math.min(55, Number.parseInt(state.durationMinutes || "0", 10)));
			m = m - (m % 5);
			const parts: string[] = [];
			if (d) parts.push(`${d} day${d === 1 ? "" : "s"}`);
			if (h) parts.push(`${h} hour${h === 1 ? "" : "s"}`);
			if (m) parts.push(`${m} min`);
			const durationLabel = parts.join(" ") || "0 min";
			formData.append("duration", durationLabel);
		}
		// Price (preserve current value in drafts)
		formData.append("price", state.price.trim() || "0");
		const selectedCountryLocal = countries.find((c) => c.id === state.meeting.countryId) || null;
		const selectedStateLocal = selectedCountryLocal?.states.find((s) => s.id === state.meeting.stateId) || null;
		const parts = [state.meeting.city, selectedStateLocal?.name ?? "", state.meeting.country].filter((p) => Boolean(p && p.trim()));
		const displayLocation = parts.join(", ");
		if (displayLocation) formData.append("location", displayLocation);
		if (state.description.trim()) formData.append("description", state.description.trim());
		formData.append("audience", state.audience);
		if (state.tags.length) formData.append("tags", state.tags.join(","));
		if (state.categoryId) formData.append("categoryId", state.categoryId);
		if (state.category) formData.append("category", state.category);
		formData.append("status", "DRAFT");
		if (state.hero.file) {
			formData.append("heroImage", state.hero.file);
		}
		const galleryNew = state.gallery.filter((item) => item.status === "new" && !item.removed);
		galleryNew.forEach((item) => {
			if (item.file) formData.append("galleryImages", item.file);
		});
		if (state.meeting.address) formData.append("meetingAddress", state.meeting.address);
		if (state.meeting.city) formData.append("meetingCity", state.meeting.city);
		if (state.meeting.country) formData.append("meetingCountry", state.meeting.country);
		if (state.meeting.countryId) formData.append("countryId", state.meeting.countryId);
		if (state.meeting.stateId) formData.append("stateId", state.meeting.stateId);
		if (state.meeting.cityId) formData.append("cityId", state.meeting.cityId);
		if (state.meeting.latitude) formData.append("meetingLatitude", state.meeting.latitude);
		if (state.meeting.longitude) formData.append("meetingLongitude", state.meeting.longitude);
		const itineraryMeta = state.itinerary
			.filter((item) => !item.removed)
			.map((item, index) => {
				const meta: Record<string, unknown> = { order: index, title: item.title, subtitle: item.subtitle };
				// include optional per-activity duration label if provided
				{
					const h = Math.max(0, Math.min(23, Number.parseInt(item.durationHours || "0", 10) || 0));
					let m = Math.max(0, Math.min(55, Number.parseInt(item.durationMinutes || "0", 10) || 0));
					m = m - (m % 5);
					const parts: string[] = [];
					if (h) parts.push(`${h} hour${h === 1 ? "" : "s"}`);
					if (m) parts.push(`${m} min`);
					const label = parts.join(" ");
					if (label) (meta as Record<string, unknown>).duration = label;
				}
				if (mode === "edit" && item.status === "existing") meta.id = item.id;
				if (item.file) {
					const key = `itineraryImage-${item.id}`;
					meta.imageKey = key;
					formData.append(key, item.file);
				} else if (item.url) {
					meta.imageUrl = item.url;
				}
				return meta;
			});
		formData.append("itinerary", JSON.stringify(itineraryMeta));
		const sessionsMeta = state.sessions.map((session) => {
			const isDifferent = Boolean(session.useDifferentLocation);
			const hasDifferentPrice = Boolean(session.useDifferentPrice);
			const useDifferentDuration = Boolean(session.useDifferentDuration);
			function buildDurationLabel(daysStr?: string, hoursStr?: string, minutesStr?: string) {
				const d = Math.max(0, Math.min(7, Number.parseInt(daysStr || "0", 10)));
				const h = Math.max(0, Math.min(23, Number.parseInt(hoursStr || "0", 10)));
				let m = Math.max(0, Math.min(55, Number.parseInt(minutesStr || "0", 10)));
				m = m - (m % 5);
				const parts: string[] = [];
				if (d) parts.push(`${d} day${d === 1 ? "" : "s"}`);
				if (h) parts.push(`${h} hour${h === 1 ? "" : "s"}`);
				if (m) parts.push(`${m} min`);
				return parts.join(" ") || "0 min";
			}
			return {
				id: mode === "edit" && session.status === "existing" ? session.id : undefined,
				startAt: new Date(session.startAt).toISOString(),
				duration: useDifferentDuration ? buildDurationLabel(session.durationDays, session.durationHours, session.durationMinutes) : null,
				capacity: Number.parseInt(session.capacity || "0", 10) || 0,
				priceOverride: hasDifferentPrice && session.priceOverride ? Number.parseInt(session.priceOverride, 10) : null,
				meetingAddress: isDifferent && session.meetingAddress ? session.meetingAddress : null,
				meetingLatitude: isDifferent && session.meetingLatitude ? Number.parseFloat(session.meetingLatitude) : null,
				meetingLongitude: isDifferent && session.meetingLongitude ? Number.parseFloat(session.meetingLongitude) : null,
			};
		});
		formData.append("sessions", JSON.stringify(sessionsMeta));

		const url = mode === "create" ? "/api/experiences" : `/api/organizer/experiences/${experienceId}`;
		const method = mode === "create" ? "POST" : "PATCH";

		startTransition(async () => {
			setError(null);
			setMessage(null);

			const response = await fetch(url, { method, body: formData });
			if (!response.ok) {
				const data = await response.json().catch(() => ({ message: "Unable to save draft" }));
				setError(data.message ?? "Unable to save draft");
				return;
			}
			await response.json().catch(() => ({}));
			if (mode === "create") {
				onSuccess?.();
				onClose?.();
				if (!onSuccess) router.refresh();
			} else {
				setMessage("Draft saved");
				onSuccess?.();
				router.refresh();
			}
		});
	};

	const nextStep = () => {
		setCurrentStep((step) => Math.min(step + 1, totalSteps - 1));
	};

	const prevStep = () => {
		setCurrentStep((step) => Math.max(step - 1, 0));
	};

	const selectedCountry = useMemo(() => countries.find((c) => c.id === state.meeting.countryId) ?? null, [countries, state.meeting.countryId]);
	const availableStates = useMemo(() => selectedCountry?.states ?? [], [selectedCountry]);
	const selectedState = useMemo(() => availableStates.find((s) => s.id === state.meeting.stateId) ?? null, [availableStates, state.meeting.stateId]);
	const availableCities = useMemo(() => (selectedState ? selectedState.cities : selectedCountry?.cities ?? []), [selectedCountry, selectedState]);

	const canProceedStep4 = useMemo(() => {
		const addressOk = Boolean(state.meeting.address.trim());
		const countryIdOk = Boolean(state.meeting.countryId);
		const countryNameOk = Boolean(state.meeting.country.trim());
		const stateIdOk = availableStates.length === 0 ? true : Boolean(state.meeting.stateId);
		const cityIdOk = Boolean(state.meeting.cityId);
		const cityNameOk = Boolean(state.meeting.city.trim());
		const latOk = state.meeting.latitude.trim().length > 0;
		const lngOk = state.meeting.longitude.trim().length > 0;
		return addressOk && countryIdOk && countryNameOk && stateIdOk && cityIdOk && cityNameOk && latOk && lngOk;
	}, [
		availableStates.length,
		state.meeting.address,
		state.meeting.city,
		state.meeting.cityId,
		state.meeting.country,
		state.meeting.countryId,
		state.meeting.latitude,
		state.meeting.longitude,
		state.meeting.stateId,
	]);

	const organizerIntroValid = useMemo(() => {
		if (!organizerIntro) return true;
		const aboutSelf = (state.organizerAboutSelf ?? "").trim();
		const aboutExp = (state.organizerAboutExperience ?? "").trim();
		const terms = Boolean(state.organizerTermsAccepted);
		return aboutSelf.length >= 30 && aboutExp.length >= 30 && terms;
	}, [organizerIntro, state.organizerAboutSelf, state.organizerAboutExperience, state.organizerTermsAccepted]);

	const logicalIndex = organizerIntro ? Math.max(0, currentStep - 1) : currentStep;

	const disabledNext = (() => {
		if (organizerIntro && currentStep === 0) return !organizerIntroValid;
		switch (logicalIndex) {
			case 0:
				return !canProceedStep1;
			case 1:
				return !canProceedStep2;
			case 2:
				return !canProceedStep3;
			case 3:
				return !canProceedStep4;
			case 4:
				return !canProceedStep5;
			default:
				return false;
		}
	})();

	const renderStepContent = () => {
		if (verificationStep?.enabled && currentStep === steps.length - 1) {
			return (
				<div className="space-y-4">
					<Card className="border-border/60 bg-card/80 shadow-sm">
						<CardHeader>
							<h3 className="text-base font-semibold text-foreground">Verification</h3>
							<p className="text-sm text-muted-foreground">Review details across steps. Approve to publish, or reject with a note.</p>
						</CardHeader>
						<CardContent className="space-y-3">
							<TextareaField
								label="Rejection note (optional for approve, required for reject)"
								value={verifyNote}
								onChange={(e) => setVerifyNote(e.target.value)}
								rows={4}
							/>
							<div className="flex flex-wrap gap-2">
								<Button
									type="button"
									onClick={() => {
										startTransition(async () => {
											setError(null);
											try {
												await verificationStep.onApprove();
												onClose?.();
												router.refresh();
											} catch (e) {
												setError(e instanceof Error ? e.message : "Unable to approve");
											}
										});
									}}
									disabled={pending}
								>
									Approve & publish
								</Button>
								<Button
									type="button"
									variant="destructive"
									onClick={() => {
										startTransition(async () => {
											setError(null);
											try {
												if (!verifyNote.trim()) throw new Error("Please provide a rejection note");
												await verificationStep.onReject(verifyNote.trim());
												onClose?.();
												router.refresh();
											} catch (e) {
												setError(e instanceof Error ? e.message : "Unable to reject");
											}
										});
									}}
									disabled={pending}
								>
									Reject
								</Button>
							</div>
							{error ? <p className="text-sm text-destructive">{error}</p> : null}
						</CardContent>
					</Card>
				</div>
			);
		}
		if (organizerIntro && currentStep === 0) {
			return (
				<div className="space-y-6">
					<Card className="border-border/60 bg-card/80 shadow-sm">
						<CardHeader>
							<h3 className="text-base font-semibold text-foreground">Organizer</h3>
							<p className="text-sm text-muted-foreground">Share a little about yourself and your hosting plans.</p>
						</CardHeader>
						<CardContent className="space-y-4">
							<TextareaField
								label={
									<>
										Tell us about yourself <span className="text-destructive">*</span>
									</>
								}
								rows={4}
								value={state.organizerAboutSelf ?? ""}
								onChange={(e) => setState((prev) => ({ ...prev, organizerAboutSelf: e.target.value }))}
								placeholder="Background, hosting style, relevant experience"
								required
							/>
							<TextareaField
								label={
									<>
										Tell us about your experience <span className="text-destructive">*</span>
									</>
								}
								rows={4}
								value={state.organizerAboutExperience ?? ""}
								onChange={(e) => setState((prev) => ({ ...prev, organizerAboutExperience: e.target.value }))}
								placeholder="What will guests do? Why is it special? Safety and logistics"
								required
							/>
							<div className="flex items-center gap-2">
								<input
									id="organizer-terms"
									type="checkbox"
									checked={Boolean(state.organizerTermsAccepted)}
									onChange={(e) => setState((prev) => ({ ...prev, organizerTermsAccepted: e.target.checked }))}
									className="h-4 w-4"
								/>
								<label htmlFor="organizer-terms" className="text-sm text-foreground">
									I agree to the organizer terms & conditions
								</label>
							</div>
							{!organizerIntroValid ? <p className="text-xs text-muted-foreground">Add at least 30 characters to each field and accept the terms.</p> : null}
						</CardContent>
					</Card>
				</div>
			);
		}

		switch (logicalIndex) {
			case 0:
				return (
					<div className="space-y-6">
						<InputField
							label={
								<>
									Experience title <span className="text-destructive">*</span>
								</>
							}
							value={state.title}
							onChange={(event: React.ChangeEvent<HTMLInputElement>) => handleBasicFieldChange("title", event.target.value)}
							required
						/>

						<InputField
							label={
								<>
									Short summary <span className="text-destructive">*</span>
								</>
							}
							value={state.summary}
							onChange={(event: React.ChangeEvent<HTMLInputElement>) => handleBasicFieldChange("summary", event.target.value)}
							placeholder="What guests can expect"
							caption="Appears on cards and promotional surfaces."
							required
						/>

						<div className="space-y-2">
							<TextareaField
								label={
									<>
										Detailed description <span className="text-destructive">*</span>
									</>
								}
								rows={6}
								value={state.description}
								onChange={(event) => handleBasicFieldChange("description", event.target.value)}
								placeholder="Outline the flow, expectations, and highlights."
								minLength={200}
								maxLength={1000}
								required
							/>
							<div className="text-right">
								<span className="text-xs text-muted-foreground">{state.description.trim().length}/1000</span>
							</div>
						</div>

						{/* Audience & Age Range */}
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<RadioGroupField
									label={"Audience"}
									name="audience"
									value={state.audience}
									onChange={(val) => handleBasicFieldChange("audience", val)}
									options={[
										{ value: "all", label: "All" },
										{ value: "men", label: "Men" },
										{ value: "women", label: "Women" },
										{ value: "kids", label: "Kids" },
									]}
								/>
							</div>
						</div>

						{/* Row 1: Category and Tags */}
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<SelectField
									label={
										<>
											Category <span className="text-destructive">*</span>
										</>
									}
									value={state.categoryId}
									required
									onChange={(event) => {
										const id = event.target.value;
										const match = categories.find((c) => c.id === id);
										setState((prev) => ({
											...prev,
											categoryId: id,
											category: match?.name ?? prev.category,
										}));
									}}
								>
									<option value="">Select a category</option>
									{categories.map((category) => (
										<option key={category.id} value={category.id}>
											{category.name}
										</option>
									))}
								</SelectField>
							</div>
							<div className="space-y-2">
								<TagsInput
									label="Tags"
									tags={state.tags}
									inputValue={state.tagInput}
									onChangeInput={(value) => setState((prev) => ({ ...prev, tagInput: value }))}
									onAddTags={(parts) => addTags(parts)}
									onRemoveTag={(tag) => removeTag(tag)}
									caption={"Press enter to add tags. They help explorers find your experience."}
								/>
							</div>
						</div>

						{/* Row 2: Price and Duration */}
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<PriceInput
									label={
										<>
											Price per spot <span className="text-destructive">*</span>
										</>
									}
									value={state.price}
									onValueChange={(next) => handleBasicFieldChange("price", next)}
									required
									currency={currency}
								/>
							</div>
							<div className="space-y-2">
								<FormField>
									<FormLabel>
										Duration <span className="text-destructive">*</span>
									</FormLabel>
									<DurationSelector
										value={{ days: state.durationDays, hours: state.durationHours, minutes: state.durationMinutes }}
										onChange={(next) => setState((prev) => ({ ...prev, durationDays: next.days, durationHours: next.hours, durationMinutes: next.minutes }))}
										daysEnabled
										hoursEnabled
										minutesEnabled
										maxDays={7}
										maxHours={23}
										minuteStep={5}
									/>
									<FormDescription>Share the approximate runtime so guests can plan around it.</FormDescription>
								</FormField>
							</div>
						</div>

						{/* Primary location removed; location is defined in Meeting point */}
					</div>
				);

			case 1:
				return (
					<div className="space-y-6">
						<Card className="border-border/60 bg-card/80 shadow-sm">
							<CardHeader className="gap-2">
								<h3 className="text-base font-semibold text-foreground">
									Featured image <span className="text-destructive">*</span>
								</h3>
								<p className="text-sm text-muted-foreground">This hero photo is used across cards and top of the experience page.</p>
							</CardHeader>
							<CardContent className="flex flex-col gap-4">
								<div className="flex flex-col gap-2">
									<UploadSinglePicture
										id="hero-image"
										previewUrl={state.hero.preview}
										onChangeFile={(file) => {
											if (heroObjectUrl.current) {
												URL.revokeObjectURL(heroObjectUrl.current);
											}
											const preview = URL.createObjectURL(file);
											heroObjectUrl.current = preview;
											setState((prev) => ({
												...prev,
												hero: {
													url: prev.hero.url,
													file,
													preview,
													removed: false,
												},
											}));
										}}
										onRemove={removeHero}
										uploadLabel="Upload hero image"
										aspect="fullWidth"
									/>
								</div>
							</CardContent>
						</Card>

						<Card className="border-border/60 bg-card/80 shadow-sm">
							<CardHeader className="gap-2">
								<h3 className="text-base font-semibold text-foreground">
									Gallery <span className="text-destructive">*</span>
								</h3>
								<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
									<p className="text-sm text-muted-foreground">Showcase different moments—behind the scenes, preparation, or guest highlights.</p>
									<span className="text-xs font-medium text-muted-foreground">
										{galleryCount} / {MAX_GALLERY_ITEMS} images (min 5)
									</span>
								</div>
							</CardHeader>
							<CardContent className="space-y-4">
								<UploadMultiplePictures
									id="gallery-images"
									selected={state.gallery.filter((item) => !item.removed).map((item) => ({ id: item.id, previewUrl: item.preview ?? item.url ?? "" }))}
									onAddFiles={(files) => {
										const input = { target: { files } } as unknown as React.ChangeEvent<HTMLInputElement>;
										// reuse existing logic for limits and object URLs
										handleGallerySelect(input);
									}}
									onRemove={(id) => removeGalleryItem(id)}
									uploadLabel="Add gallery photos"
									max={MAX_GALLERY_ITEMS}
									aspect="threeFour"
									gridClassName="grid gap-3 sm:grid-cols-3 lg:grid-cols-5"
								/>
							</CardContent>
						</Card>
					</div>
				);

			case 2:
				return (
					<div className="space-y-4">
						{state.itinerary
							.filter((step) => !step.removed)
							.map((step, index) => (
								<Card key={step.id} className="border-border/60 bg-card/80 shadow-sm">
									<CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
										<h3 className="text-base font-semibold text-foreground">Activity {index + 1}</h3>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="text-destructive"
											onClick={() => removeItineraryStep(step.id)}
											aria-label="Remove activity"
										>
											<Trash className="h-4 w-4" />
										</Button>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="flex flex-col gap-4 sm:flex-row">
											<div className="flex items-start shrink-0">
												<UploadSinglePicture
													id={`itinerary-image-${step.id}`}
													previewUrl={step.preview ?? step.url ?? null}
													onChangeFile={(file) => handleItineraryImageChange(step.id, file)}
													onRemove={() => removeItineraryImage(step.id)}
													uploadLabel="Upload image"
													aspect="square"
												/>
											</div>
											<div className="space-y-4 flex-1 min-w-0">
												<InputField
													label={
														<>
															Title <span className="text-destructive">*</span>
														</>
													}
													value={step.title}
													onChange={(event) => updateItineraryField(step.id, "title", event.target.value)}
													required
												/>
												<InputField
													label="Subtitle"
													value={step.subtitle}
													onChange={(event) => updateItineraryField(step.id, "subtitle", event.target.value)}
												/>
												<FormField>
													<FormLabel>Duration</FormLabel>
													<FormControl>
														<DurationSelector
															value={{ days: "0", hours: step.durationHours ?? "0", minutes: step.durationMinutes ?? "0" }}
															onChange={(next) => {
																updateItineraryField(step.id, "durationHours", next.hours);
																updateItineraryField(step.id, "durationMinutes", next.minutes);
															}}
															daysEnabled={false}
															hoursEnabled
															minutesEnabled
															maxHours={23}
															minuteStep={5}
														/>
													</FormControl>
												</FormField>
											</div>
										</div>
									</CardContent>
								</Card>
							))}
						<Button type="button" variant="outline" onClick={handleItineraryAdd}>
							Add activity
						</Button>
					</div>
				);

			case 3:
				return (
					<div className="space-y-6">
						<InputField
							label={
								<>
									Address <span className="text-destructive">*</span>
								</>
							}
							value={state.meeting.address}
							onChange={(event) => setState((prev) => ({ ...prev, meeting: { ...prev.meeting, address: event.target.value } }))}
							placeholder="Street and number"
							required
						/>
						{/* Country, State, City - three columns in one row */}
						<div className="grid gap-4 sm:grid-cols-3">
							<div className="space-y-2">
								<SelectField
									label={
										<>
											Country <span className="text-destructive">*</span>
										</>
									}
									value={state.meeting.countryId}
									required
									onChange={(event) => {
										const id = event.target.value;
										const match = countries.find((c) => c.id === id) ?? null;
										setState((prev) => ({
											...prev,
											meeting: {
												...prev.meeting,
												countryId: id,
												stateId: "",
												cityId: "",
												country: match?.name ?? "",
												city: "",
											},
										}));
									}}
								>
									<option value="">Select a country</option>
									{countries.map((country) => (
										<option key={country.id} value={country.id}>
											{country.name}
										</option>
									))}
								</SelectField>
							</div>
							<div className="space-y-2">
								<SelectField
									label={
										<>
											State/Region <span className="text-destructive">*</span>
										</>
									}
									value={state.meeting.stateId}
									onChange={(event) => {
										const id = event.target.value;
										setState((prev) => ({
											...prev,
											meeting: {
												...prev.meeting,
												stateId: id,
												cityId: "",
											},
										}));
									}}
									disabled={!selectedCountry || availableStates.length === 0}
									required={availableStates.length > 0}
								>
									<option value="">{availableStates.length ? "Select a state" : "No states"}</option>
									{availableStates.map((state) => (
										<option key={state.id} value={state.id}>
											{state.name}
										</option>
									))}
								</SelectField>
							</div>
							<div className="space-y-2">
								<SelectField
									label={
										<>
											City <span className="text-destructive">*</span>
										</>
									}
									value={state.meeting.cityId}
									onChange={(event) => {
										const id = event.target.value;
										const match = availableCities.find((c) => c.id === id) ?? null;
										setState((prev) => ({
											...prev,
											meeting: {
												...prev.meeting,
												cityId: id,
												city: match?.name ?? prev.meeting.city,
												latitude: match && typeof match.latitude === "number" ? String(match.latitude) : prev.meeting.latitude,
												longitude: match && typeof match.longitude === "number" ? String(match.longitude) : prev.meeting.longitude,
											},
										}));
									}}
									disabled={!selectedCountry}
									required
								>
									<option value="">{availableCities.length ? "Select a city" : "No cities"}</option>
									{availableCities.map((city) => (
										<option key={city.id} value={city.id}>
											{city.name}
										</option>
									))}
								</SelectField>
							</div>
						</div>
						<MapLatLng
							lat={state.meeting.latitude}
							lng={state.meeting.longitude}
							onLatChange={(value) => setState((prev) => ({ ...prev, meeting: { ...prev.meeting, latitude: value } }))}
							onLngChange={(value) => setState((prev) => ({ ...prev, meeting: { ...prev.meeting, longitude: value } }))}
							onMapChange={(lat, lng) => setState((prev) => ({ ...prev, meeting: { ...prev.meeting, latitude: String(lat), longitude: String(lng) } }))}
							height={360}
							required
							hint={
								process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
									? "Click the map to set a pin and update coordinates."
									: "Add coordinates to preview a map, or set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for interactive pinning."
							}
						/>
					</div>
				);

			case 4:
				return (
					<div className="relative space-y-4 lg:pl-16">
						{/* Continuous vertical timeline line on large screens */}
						<div className="absolute left-17 -mt-12 border-l-2 border-border/70 top-0 bottom-0 hidden lg:block" />
						{/* Counter line - sticky */}
						<div className="mb-2 ml-6 flex items-center justify-center text-sm font-bold text-muted-foreground sticky top-[-24px] z-10 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4">
							<span>
								{state.sessions.length} / {MAX_SESSIONS} sessions
							</span>
						</div>
						{sessionsSorted.map((session, index) => (
							<div key={session.id} id={`session-${session.id}`} className="grid grid-cols-[12px_1fr] items-stretch gap-4">
								<div className="relative hidden lg:block">
									{/* Dot for this session */}
									<div className="absolute left-full mt-8 h-3 w-3 -translate-x-1/1 rounded-full bg-primary" />
									{/* Month label for first session of each month */}
									{(index === 0 ||
										new Date(sessionsSorted[index - 1].startAt).getMonth() !== new Date(session.startAt).getMonth() ||
										new Date(sessionsSorted[index - 1].startAt).getFullYear() !== new Date(session.startAt).getFullYear()) && (
										<div className="pointer-events-none absolute right-full top-6 z-10 mr-3 rounded-md border border-border/60 bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
											{(() => {
												try {
													const dateOnly = getDatePart(session.startAt) || session.startAt.split("T")[0];
													return format(new Date(dateOnly as string), "LLL");
												} catch {
													return "";
												}
											})()}
										</div>
									)}
								</div>
								<Card className="relative border-border/60 bg-card/80 shadow-sm">
									<CardHeader className="flex flex-col mb-0 gap-2 sm:flex-row sm:items-center sm:justify-between">
										<button
											type="button"
											className="text-left"
											onClick={() => toggleSessionExpanded(session.id)}
											aria-expanded={expandedSessions[session.id] ? "true" : "false"}
										>
											<SessionSummary session={session} expanded={expandedSessions[session.id]} />
										</button>
										<div className="flex items-center gap-2">
											<Button
												type="button"
												variant="ghost"
												size="icon"
												onClick={() => toggleSessionExpanded(session.id)}
												aria-label={expandedSessions[session.id] ? "Collapse" : "Expand"}
											>
												{expandedSessions[session.id] ? <ChevronDown /> : <ChevronRight />}
											</Button>
											{state.sessions.length > 1 ? (
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="text-destructive"
													onClick={() => removeSession(session.id)}
													disabled={Number.parseInt(String(session.reservedGuests ?? 0), 10) > 0}
													title={Number.parseInt(String(session.reservedGuests ?? 0), 10) > 0 ? "Cannot remove a session with reservations" : undefined}
													aria-label="Remove session"
												>
													<Trash className="h-4 w-4" />
												</Button>
											) : null}
										</div>
									</CardHeader>
									{expandedSessions[session.id] ? (
										<CardContent className="space-y-4">
											<div className="grid gap-4 sm:grid-cols-3">
												<div className="space-y-3">
													<FormField>
														<FormLabel>
															Start date <span className="text-destructive">*</span>
														</FormLabel>
														<Popover>
															<PopoverTrigger asChild>
																<Button type="button" variant="outline" className="h-11 justify-start gap-2 text-left font-normal">
																	<CalendarIcon className="size-4" />
																	{getDatePart(session.startAt) ? format(new Date(getDatePart(session.startAt) as string), "LLL dd, yyyy") : "Pick a date"}
																</Button>
															</PopoverTrigger>
															<PopoverContent className="w-auto p-2" align="start" sideOffset={8}>
																<Calendar
																	value={{
																		from: getDatePart(session.startAt) ? new Date(getDatePart(session.startAt) as string) : undefined,
																		to: getDatePart(session.startAt) ? new Date(getDatePart(session.startAt) as string) : undefined,
																	}}
																	onChange={(range) => {
																		if (range?.from) setStartDate(session.id, range.from);
																	}}
																	monthCount={1}
																/>
															</PopoverContent>
														</Popover>
													</FormField>
												</div>
												<div className="space-y-3">
													<FormField>
														<FormLabel>
															Start time <span className="text-destructive">*</span>
														</FormLabel>
														<FormControl>
															<div className="flex items-center gap-2">
																<select
																	className="h-11 w-24 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus-visible:border-ring"
																	value={(getTimePart(session.startAt) || "09:00").split(":")[0]}
																	onChange={(e) => {
																		const minutes = (getTimePart(session.startAt) || "09:00").split(":")[1] || "00";
																		setStartTime(session.id, `${e.target.value}:${minutes}`);
																	}}
																>
																	{Array.from({ length: 24 }).map((_, h) => {
																		const hh = String(h).padStart(2, "0");
																		return (
																			<option key={hh} value={hh}>
																				{hh}
																			</option>
																		);
																	})}
																</select>
																<span className="text-muted-foreground">:</span>
																<select
																	className="h-11 w-24 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus-visible:border-ring"
																	value={(getTimePart(session.startAt) || "09:00").split(":")[1] || "00"}
																	onChange={(e) => {
																		const hours = (getTimePart(session.startAt) || "09:00").split(":")[0] || "09";
																		setStartTime(session.id, `${hours}:${e.target.value}`);
																	}}
																>
																	{Array.from({ length: 12 }).map((_, i) => {
																		const mm = String(i * 5).padStart(2, "0");
																		return (
																			<option key={mm} value={mm}>
																				{mm}
																			</option>
																		);
																	})}
																</select>
															</div>
														</FormControl>
													</FormField>
												</div>
												<div className="space-y-3">
													<FormField>
														<FormLabel>
															Capacity <span className="text-destructive">*</span>
														</FormLabel>
														<FormControl>
															<Stepper
																value={session.capacity}
																onChange={(val) => updateSessionField(session.id, "capacity", val)}
																min={Math.max(0, Number.parseInt(String(session.reservedGuests ?? 0), 10) || 0)}
																max={100}
															/>
														</FormControl>
													</FormField>
												</div>
											</div>
											<div className="grid gap-4">
												{/* Capacity moved to first row */}
												<div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
													<span className="text-sm text-muted-foreground">Use different price for this session</span>
													<button
														type="button"
														className={`relative inline-flex h-6 w-10 items-center rounded-full transition ${
															session.useDifferentPrice ? "bg-primary" : "bg-muted"
														}`}
														onClick={() => toggleSessionDifferentPrice(session.id)}
														aria-pressed={session.useDifferentPrice ? "true" : "false"}
													>
														<span
															className={`inline-block size-5 transform rounded-full bg-background shadow transition ${
																session.useDifferentPrice ? "translate-x-4" : "translate-x-0"
															}`}
														/>
													</button>
												</div>
												{session.useDifferentPrice ? (
													<FormField>
														<FormLabel>Price override</FormLabel>
														<FormControl>
															<div className="relative">
																<FormInput
																	type="text"
																	inputMode="numeric"
																	pattern="[0-9]*"
																	value={session.priceOverride}
																	onKeyDown={(e) => {
																		const blocked = ["e", "E", "+", "-", ".", ","];
																		if (blocked.includes(e.key)) e.preventDefault();
																	}}
																	onChange={(event) => {
																		const next = sanitisePriceInput(event.target.value);
																		updateSessionField(session.id, "priceOverride", next);
																	}}
																	onBlur={(event) => {
																		const next = sanitisePriceInput(event.target.value);
																		updateSessionField(session.id, "priceOverride", next);
																	}}
																	placeholder="Matches base price"
																	className="pr-16"
																/>
																{currency ? (
																	<span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
																		{currency}
																	</span>
																) : null}
															</div>
														</FormControl>
													</FormField>
												) : null}
												<div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
													<span className="text-sm text-muted-foreground">Use different duration for this session</span>
													<button
														type="button"
														className={`relative inline-flex h-6 w-10 items-center rounded-full transition ${
															session.useDifferentDuration ? "bg-primary" : "bg-muted"
														}`}
														onClick={() => toggleSessionDifferentDuration(session.id)}
														aria-pressed={session.useDifferentDuration ? "true" : "false"}
													>
														<span
															className={`inline-block size-5 transform rounded-full bg-background shadow transition ${
																session.useDifferentDuration ? "translate-x-4" : "translate-x-0"
															}`}
														/>
													</button>
												</div>
												{session.useDifferentDuration ? (
													<FormField>
														<FormLabel>Session duration</FormLabel>
														<div className="grid gap-2 sm:grid-cols-3">
															<div>
																<FormControl>
																	<select
																		className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus-visible:border-ring"
																		value={session.durationDays ?? "0"}
																		onChange={(e) => updateSessionField(session.id, "durationDays", e.target.value)}
																	>
																		{Array.from({ length: 8 }).map((_, i) => (
																			<option key={i} value={String(i)}>
																				{i} day{i === 1 ? "" : "s"}
																			</option>
																		))}
																	</select>
																</FormControl>
															</div>
															<div>
																<FormControl>
																	<select
																		className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus-visible:border-ring"
																		value={session.durationHours ?? "0"}
																		onChange={(e) => updateSessionField(session.id, "durationHours", e.target.value)}
																	>
																		{Array.from({ length: 24 }).map((_, i) => (
																			<option key={i} value={String(i)}>
																				{i} hour{i === 1 ? "" : "s"}
																			</option>
																		))}
																	</select>
																</FormControl>
															</div>
															<div>
																<FormControl>
																	<select
																		className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus-visible:border-ring"
																		value={session.durationMinutes ?? "0"}
																		onChange={(e) => updateSessionField(session.id, "durationMinutes", e.target.value)}
																	>
																		{[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
																			<option key={m} value={String(m)}>
																				{m} min
																			</option>
																		))}
																	</select>
																</FormControl>
															</div>
														</div>
													</FormField>
												) : null}
												{/* price override rendered above toggle */}
												<div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
													<span className="text-sm text-muted-foreground">Use different location for this session</span>
													<button
														type="button"
														className={`relative inline-flex h-6 w-10 items-center rounded-full transition ${
															session.useDifferentLocation ? "bg-primary" : "bg-muted"
														}`}
														onClick={() => toggleSessionDifferentLocation(session.id)}
														aria-pressed={session.useDifferentLocation ? "true" : "false"}
													>
														<span
															className={`inline-block size-5 transform rounded-full bg-background shadow transition ${
																session.useDifferentLocation ? "translate-x-4" : "translate-x-0"
															}`}
														/>
													</button>
												</div>
											</div>
											{session.useDifferentLocation ? (
												<>
													<FormField>
														<FormLabel>Session address</FormLabel>
														<FormControl>
															<FormInput
																value={session.meetingAddress}
																onChange={(event) => updateSessionField(session.id, "meetingAddress", event.target.value)}
																placeholder="Street and number"
															/>
														</FormControl>
													</FormField>
													<div className="grid gap-4">
														<FormField>
															<FormLabel>City</FormLabel>
															<FormControl>
																<FormInput value={state.meeting.city} disabled />
															</FormControl>
														</FormField>
													</div>
													<MapLatLng
														lat={session.meetingLatitude ?? ""}
														lng={session.meetingLongitude ?? ""}
														onLatChange={(value) => updateSessionField(session.id, "meetingLatitude", value)}
														onLngChange={(value) => updateSessionField(session.id, "meetingLongitude", value)}
														onMapChange={(lat, lng) => {
															updateSessionField(session.id, "meetingLatitude", String(lat));
															updateSessionField(session.id, "meetingLongitude", String(lng));
														}}
														height={360}
														hint="Optional per-session pin. Defaults to meeting point when empty."
													/>
												</>
											) : null}
										</CardContent>
									) : null}
								</Card>
							</div>
						))}
						<div className="flex flex-wrap gap-2 ml-12">
							<Button
								variant="outline"
								disabled={state.sessions.length >= MAX_SESSIONS}
								onClick={() => {
									const last = getLastSession();
									const base = last ? new Date(getDatePart(last.startAt) as string) : new Date();
									base.setDate(base.getDate() + 1);
									const time = last ? getTimePart(last.startAt) || "09:00" : "09:00";
									const [h, m] = time.split(":").map((p) => Number.parseInt(p || "0", 10));
									base.setHours(h, m, 0, 0);
									addSessionAt(base);
								}}
							>
								Add next day (same time)
							</Button>
							<Button
								variant="outline"
								disabled={state.sessions.length >= MAX_SESSIONS}
								onClick={() => {
									const last = getLastSession();
									const base = last ? new Date(getDatePart(last.startAt) as string) : new Date();
									base.setDate(base.getDate() + 7);
									const time = last ? getTimePart(last.startAt) || "09:00" : "09:00";
									const [h, m] = time.split(":").map((p) => Number.parseInt(p || "0", 10));
									base.setHours(h, m, 0, 0);
									addSessionAt(base);
								}}
							>
								Add next week (same day/time)
							</Button>
							<Button
								variant="outline"
								disabled={state.sessions.length >= MAX_SESSIONS}
								onClick={() => {
									const last = getLastSession();
									const base = last ? getSessionEndDate(last) : new Date();
									base.setMinutes(base.getMinutes() + 60);
									addSessionAt(base);
								}}
							>
								Add next session
							</Button>
						</div>
					</div>
				);

			default:
				return null;
		}
	};

	return (
		<div className="flex h-full flex-col">
			<header className="border-b border-border/60 px-6 py-4">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
							Step {currentStep + 1} of {totalSteps}
						</p>
						<h2 className="text-lg font-semibold text-foreground">{steps[currentStep].title}</h2>
						<p className="text-sm text-muted-foreground">{steps[currentStep].description}</p>
					</div>
					{onClose ? (
						<Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground hover:text-foreground">
							Close
						</Button>
					) : null}
				</div>
				<nav aria-label="Wizard progress" className="mt-6 hidden lg:block">
					<ol className="flex items-center gap-3">
						{progressSteps.map((step) => {
							const isLast = step.index === progressSteps.length - 1;
							const circleBase = "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold";
							const lineBase = "h-[2px] flex-1";
							const currentClasses =
								step.status === "complete"
									? "border-primary bg-primary text-primary-foreground"
									: step.status === "current"
									? "border-primary text-primary"
									: "border-border/70 text-muted-foreground";
							const lineClasses = step.status === "complete" ? "bg-primary" : step.status === "current" ? "bg-primary/60" : "bg-border/60";
							return (
								<li key={step.title} className={`flex items-center gap-3 ${isLast ? "ml-auto flex-none justify-end" : "flex-1"}`}>
									<div className="flex items-center gap-3">
										<span className={`${circleBase} ${currentClasses}`}>{step.index + 1}</span>
										<div className="min-w-0">
											<p className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{step.title}</p>
										</div>
									</div>
									{isLast ? null : <div className={`${lineBase} ${lineClasses}`} />}
								</li>
							);
						})}
					</ol>
				</nav>
			</header>
			<div className="flex-1 overflow-y-auto px-6 py-6">{renderStepContent()}</div>
			<footer className="border-t border-border/60 bg-muted/40 px-6 py-4">
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<Button variant="ghost" onClick={prevStep} disabled={currentStep === 0}>
						Back
					</Button>
					<div className="flex items-center gap-2">
						{currentStep < totalSteps - 1 ? (
							<>
								<Button variant="outline" onClick={handleSaveDraft} disabled={pending}>
									{pending ? "Saving..." : "Save draft"}
								</Button>
								<Button onClick={nextStep} disabled={disabledNext}>
									{organizerIntro && currentStep === 0 ? "Add your Experience" : "Next"}
								</Button>
							</>
						) : (
							<>
								<Button variant="outline" onClick={handleSaveDraft} disabled={pending}>
									{pending ? "Saving..." : "Save draft"}
								</Button>
								<Button onClick={handleSubmit} disabled={pending || disabledNext}>
									{pending
										? "Saving..."
										: submissionMode === "organizer-request"
										? "Submit request"
										: mode === "create"
										? "Publish experience"
										: "Save changes"}
								</Button>
							</>
						)}
					</div>
				</div>
				{message ? <p className="mt-2 text-sm text-emerald-600">{message}</p> : null}
				{error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
			</footer>
		</div>
	);
}
