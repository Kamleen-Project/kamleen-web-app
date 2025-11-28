"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type MutableRefObject } from "react";
import { useRouter } from "next/navigation";

import { CtaButton } from "@/components/ui/cta-button";
import { X, CheckCircle2, XCircle } from "lucide-react";
import CtaIconButton from "../ui/cta-icon-button";
import { format } from "date-fns";
import { parseDurationParts } from "@/lib/duration";
import { MAX_GALLERY_IMAGES, MAX_SESSIONS } from "@/config/experiences";
import { buildExperienceFormData } from "@/lib/experience-formdata";
import { getDatePart, getTimePart, formatLocalInput } from "@/lib/datetime";
import { isAllowedImageFile } from "@/lib/media";
import type { WizardState, SessionItem, ImageItem } from "@/types/experience-wizard";
import { isMeetingValid } from "@/lib/locations";

// Step components
import StepBasicInfo from "./wizard/StepBasicInfo";
import StepVisuals from "./wizard/StepVisuals";
import StepItinerary from "./wizard/StepItinerary";
import StepMeeting from "./wizard/StepMeeting";
import StepSessions from "./wizard/StepSessions";
import StepVerification from "./wizard/StepVerification";
import { TextareaField } from "@/components/ui/textarea-field";
import { CheckboxField } from "@/components/ui/checkbox-field";

type Mode = "create" | "edit";

export type ExperienceWizardInitialData = {
	id?: string;
	verificationStatus?: "NOT_SUBMITTED" | "PENDING" | "VERIFIED" | "REJECTED";
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
	// When true, show only the Sessions step (no progress nav/back/next)
	sessionsOnly?: boolean;
};

// currency is derived from the organizer's account on the server

// const MAX_GALLERY_ITEMS = MAX_GALLERY_IMAGES;

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
					return String(parseDurationParts(label ?? "").hours);
				})(),
				durationMinutes: (() => {
					const label = (step as unknown as { duration?: string }).duration;
					return String(parseDurationParts(label ?? "").minutes);
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
	const { days, hours, minutes } = parseDurationParts(label);
	return { durationDays: String(days), durationHours: String(hours), durationMinutes: String(minutes) };
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
	sessionsOnly = false,
}: ExperienceWizardProps) {
	const router = useRouter();
	const [state, setState] = useState<WizardState>(() => createInitialState(initialData));
	const [submissionOverlay, setSubmissionOverlay] = useState<null | {
		type: "success" | "error";
		title: string;
		message: string;
	}>(null);
	const steps = useMemo(() => {
		if (sessionsOnly) {
			return [stepsBase[4]]; // Sessions only
		}
		const base = organizerIntro ? [{ title: "Organizer", description: "Tell us about you and agree to host terms." }, ...stepsBase] : stepsBase;
		return verificationStep?.enabled ? [...base, { title: "Verification", description: "Approve or reject this experience for publishing." }] : base;
	}, [organizerIntro, verificationStep?.enabled, sessionsOnly]);
	const initialStepNormalized = sessionsOnly ? 0 : Math.max(0, Math.min(steps.length - 1, initialStep ?? 0));
	const [currentStep, setCurrentStep] = useState(initialStepNormalized);
	const [pending, startTransition] = useTransition();
	const heroObjectUrl = useRef<string | null>(null);
	const galleryObjectUrls = useRef<string[]>([]);
	const itineraryObjectUrls = useRef<string[]>([]);
	const approveAfterSaveRef = useRef<boolean>(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const canSaveDraft = mode === "create" || initialData?.verificationStatus === "NOT_SUBMITTED";
	const [uploading, setUploading] = useState<{ hero: boolean; gallery: Record<string, boolean>; itinerary: Record<string, boolean> }>({
		hero: false,
		gallery: {},
		itinerary: {},
	});

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

	// Determine which currency to display in inputs and labels
	const displayCurrency = useMemo(() => {
		const fromProp = typeof currency === "string" && currency.trim() ? currency.trim() : "";
		const fromInitial = typeof initialData?.currency === "string" && initialData.currency?.trim() ? (initialData.currency as string).trim() : "";
		return fromProp || fromInitial || "USD";
	}, [currency, initialData?.currency]);

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
		setState((prev) => {
			const next = { ...prev };
			// Keep default itinerary step for UX guidance
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

	// Only introduce a default session if the organizer reaches the Sessions step
	useEffect(() => {
		const li = organizerIntro ? Math.max(0, currentStep - 1) : currentStep;
		if (li < 4) return;
		if (state.sessions.length > 0) return;
		setState((prev) => {
			if (prev.sessions.length > 0) return prev;
			const now = new Date();
			const startAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
			return {
				...prev,
				sessions: [
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
				],
			};
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [organizerIntro, currentStep]);

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

	const hasPendingUploadsStep2 = useMemo(() => {
		const anyGallery = Object.values(uploading.gallery).some(Boolean);
		return uploading.hero || anyGallery;
	}, [uploading.hero, uploading.gallery]);

	const canProceedStep3 = useMemo(() => {
		const active = state.itinerary.filter((step) => !step.removed);
		if (!active.length) {
			return false;
		}
		return active.every((step) => Boolean(step.title.trim()));
	}, [state.itinerary]);

	const hasPendingUploadsStep3 = useMemo(() => Object.values(uploading.itinerary).some(Boolean), [uploading.itinerary]);

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
		let remaining = MAX_GALLERY_IMAGES - existingCount;

		if (remaining <= 0) {
			setError(`You can upload up to ${MAX_GALLERY_IMAGES} gallery images.`);
			event.target.value = "";
			return;
		}

		const additions: ImageItem[] = [];
		let invalidCount = 0;

		files.forEach((file) => {
			if (remaining <= 0) {
				return;
			}
			if (!isAllowedImageFile(file)) {
				invalidCount += 1;
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

		if (invalidCount > 0) {
			setError("Some files were skipped due to unsupported type. Use JPG, PNG, or WebP.");
		} else {
			setError(null);
		}
		setState((prev) => ({ ...prev, gallery: [...prev.gallery, ...additions] }));

		event.target.value = "";

		// upload each addition immediately
		for (const item of additions) {
			if (!item.file) continue;
			const imageId = item.id;
			setUploading((u) => ({ ...u, gallery: { ...u.gallery, [imageId]: true } }));
			void (async () => {
				try {
					const url = await uploadToServer(item.file as File, "gallery");
					setState((prev) => ({
						...prev,
						gallery: prev.gallery.map((g) => (g.id === imageId ? { ...g, url, file: undefined } : g)),
					}));
				} catch (e) {
					setError(e instanceof Error ? e.message : "Failed to upload gallery image");
				} finally {
					setUploading((u) => ({ ...u, gallery: { ...u.gallery, [imageId]: false } }));
				}
			})();
		}
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
		if (!isAllowedImageFile(file)) {
			setError("Unsupported image type. Use JPG, PNG, or WebP.");
			return;
		}
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

		setUploading((u) => ({ ...u, itinerary: { ...u.itinerary, [id]: true } }));
		void (async () => {
			try {
				const url = await uploadToServer(file, "itinerary");
				setState((prev) => ({
					...prev,
					itinerary: prev.itinerary.map((item) => (item.id === id ? { ...item, url, file: undefined } : item)),
				}));
			} catch (e) {
				setError(e instanceof Error ? e.message : "Failed to upload itinerary image");
			} finally {
				setUploading((u) => ({ ...u, itinerary: { ...u.itinerary, [id]: false } }));
			}
		})();
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

	// formatLocalInput imported from lib/datetime

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

	// Step components adapters

	async function uploadToServer(file: File, folder: "hero" | "gallery" | "itinerary"): Promise<string> {
		const fd = new FormData();
		fd.append("file", file);
		fd.append("folder", folder);
		const res = await fetch("/api/uploads/image", { method: "POST", body: fd });
		if (!res.ok) {
			try {
				const data = await res.json();
				throw new Error((data?.message as string) || "Upload failed");
			} catch {
				throw new Error("Upload failed");
			}
		}
		const data = (await res.json()) as { url: string };
		return data.url;
	}
	function onHeroFileSelected(file: File) {
		if (!isAllowedImageFile(file)) {
			setError("Unsupported image type. Use JPG, PNG, or WebP.");
			return;
		}
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

		// upload immediately
		setUploading((u) => ({ ...u, hero: true }));
		void (async () => {
			try {
				const url = await uploadToServer(file, "hero");
				setState((prev) => ({ ...prev, hero: { url, file: null, preview: prev.hero.preview, removed: false } }));
			} catch (e) {
				setError(e instanceof Error ? e.message : "Failed to upload hero image");
			} finally {
				setUploading((u) => ({ ...u, hero: false }));
			}
		})();
	}

	function onGalleryAddFiles(files: File[]) {
		const input = { target: { files } } as unknown as React.ChangeEvent<HTMLInputElement>;
		// reuse existing logic for limits and object URLs
		handleGallerySelect(input);
	}

	function updateSession(id: string, patch: Partial<SessionItem>) {
		setState((prev) => ({
			...prev,
			sessions: prev.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
		}));
	}

	const handleSubmit = () => {
		const formData = buildExperienceFormData(state, {
			mode,
			countries,
			forceDraftStatus: mode === "create",
			includeRemovals: true,
		});

		if (mode === "edit" && !experienceId) {
			setError("Experience identifier is missing");
			return;
		}

		let url = mode === "create" ? "/api/experiences" : `/api/organizer/experiences/${experienceId}`;
		let method: "POST" | "PATCH" = mode === "create" ? "POST" : "PATCH";
		if (submissionMode === "organizer-request") {
			url = "/api/organizer/apply";
			method = "POST";
			formData.append("organizerAboutSelf", (state.organizerAboutSelf ?? "").trim());
			formData.append("organizerAboutExperience", (state.organizerAboutExperience ?? "").trim());
			formData.append("organizerTermsAccepted", String(Boolean(state.organizerTermsAccepted)));
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
				const msg = (data.message ?? "Unable to save experience") as string;
				// Navigate user back to the most likely problematic step
				try {
					const lower = msg.toLowerCase();
					let target = currentStep;
					if (lower.includes("itinerary")) target = organizerIntro ? 3 : 2;
					else if (lower.includes("session")) target = organizerIntro ? 5 : 4;
					else if (lower.includes("city") || lower.includes("state") || lower.includes("country") || lower.includes("meeting")) target = organizerIntro ? 4 : 3;
					setCurrentStep(Math.max(0, Math.min(steps.length - 1, target)));
				} catch {}
				setSubmissionOverlay({ type: "error", title: "Submission failed", message: msg });
				return;
			}

			const data = await response.json().catch(() => ({} as { id?: string; slug?: string }));

			// Organizer request: show full-screen success UI and keep modal open
			if (submissionMode === "organizer-request") {
				setSubmissionOverlay({
					type: "success",
					title: "Request submitted",
					message: "Thanks for your submission. Our team will review your organizer request and notify you by email.",
				});
				return;
			}

			if (mode === "create") {
				// Submit for verification immediately after create
				const newId = typeof (data as { id?: unknown }).id === "string" ? ((data as { id?: string }).id as string) : undefined;
				if (newId) {
					const submitRes = await fetch("/api/organizer/experiences/submit-verification", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ experienceId: newId }),
					});
					if (!submitRes.ok) {
						const submitErr = await submitRes.json().catch(() => ({ message: "Unable to submit for verification" }));
						setSubmissionOverlay({ type: "error", title: "Verification failed", message: submitErr.message ?? "Unable to submit for verification" });
						return;
					}
				}
				const slug = typeof (data as { slug?: unknown }).slug === "string" ? ((data as { slug?: string }).slug as string) : undefined;
				void slug; // slug kept for potential future use
				setSubmissionOverlay({
					type: "success",
					title: "Submitted for verification",
					message: "Thanks! We will review your experience and notify you once it’s approved.",
				});
				return;
			} else {
				// Organizer edit: submit for verification after saving, unless admin verification step is enabled
				if (!verificationStep?.enabled && experienceId && !sessionsOnly) {
					try {
						const submitRes = await fetch("/api/organizer/experiences/submit-verification", {
							method: "POST",
							headers: { "content-type": "application/json" },
							body: JSON.stringify({ experienceId }),
						});
						if (!submitRes.ok && submitRes.status !== 409) {
							const submitErr = await submitRes.json().catch(() => ({ message: "Unable to submit for verification" }));
							setSubmissionOverlay({ type: "error", title: "Verification failed", message: submitErr.message ?? "Unable to submit for verification" });
							return;
						}
						// If ok or already submitted, show success and keep modal open
						setSubmissionOverlay({
							type: "success",
							title: "Submitted for verification",
							message: "Thanks! We will review your experience and notify you once it’s approved.",
						});
						return;
					} catch {
						setSubmissionOverlay({ type: "error", title: "Verification failed", message: "Unable to submit for verification" });
						return;
					}
				} else if (verificationStep?.enabled) {
					if (approveAfterSaveRef.current) {
						try {
							await verificationStep.onApprove();
							approveAfterSaveRef.current = false;
							onClose?.();
							router.refresh();
							return;
						} catch (e) {
							setSubmissionOverlay({ type: "error", title: "Approval failed", message: e instanceof Error ? e.message : "Unable to approve" });
							approveAfterSaveRef.current = false;
							return;
						}
					}
					setSubmissionOverlay({
						type: "success",
						title: "Changes saved",
						message: "Your changes have been saved successfully.",
					});
					return;
				}
				setSubmissionOverlay({
					type: "success",
					title: "Changes saved",
					message: "Your changes have been saved successfully.",
				});
				return;
			}
		});
	};

	const handleSaveDraft = () => {
		const formData = buildExperienceFormData(state, {
			mode,
			countries,
			forceDraftStatus: true,
			includeRemovals: true,
			lenientDraftFields: true,
		});

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
		return isMeetingValid(state.meeting, availableStates.length > 0);
	}, [availableStates.length, state.meeting]);

	const organizerIntroValid = useMemo(() => {
		if (!organizerIntro) return true;
		const aboutSelf = (state.organizerAboutSelf ?? "").trim();
		const aboutExp = (state.organizerAboutExperience ?? "").trim();
		const terms = Boolean(state.organizerTermsAccepted);
		return aboutSelf.length >= 30 && aboutExp.length >= 30 && terms;
	}, [organizerIntro, state.organizerAboutSelf, state.organizerAboutExperience, state.organizerTermsAccepted]);

	const logicalIndex = organizerIntro ? Math.max(0, currentStep - 1) : currentStep;

	const disabledNext = (() => {
		if (sessionsOnly) return !canProceedStep5;
		if (organizerIntro && currentStep === 0) return !organizerIntroValid;
		switch (logicalIndex) {
			case 0:
				return !canProceedStep1;
			case 1:
				return !canProceedStep2 || hasPendingUploadsStep2;
			case 2:
				return !canProceedStep3 || hasPendingUploadsStep3;
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
			return <StepVerification verifyNote={verifyNote} error={error} onChangeNote={(v) => setVerifyNote(v)} />;
		}
		if (organizerIntro && currentStep === 0) {
			return (
				<div className="space-y-8 p-2">
					<TextareaField
						label={"Tell us about yourself"}
						rows={4}
						value={state.organizerAboutSelf ?? ""}
						onChange={(e) => setState((prev) => ({ ...prev, organizerAboutSelf: e.target.value }))}
						placeholder="Background, hosting style, relevant experience"
						required
					/>
					<TextareaField
						label={"Tell us about your experience"}
						rows={4}
						value={state.organizerAboutExperience ?? ""}
						onChange={(e) => setState((prev) => ({ ...prev, organizerAboutExperience: e.target.value }))}
						placeholder="What will guests do? Why is it special? Safety and logistics"
						required
					/>
					<CheckboxField
						id="organizer-terms"
						checked={Boolean(state.organizerTermsAccepted)}
						onChange={(e) => setState((prev) => ({ ...prev, organizerTermsAccepted: (e.target as HTMLInputElement).checked }))}
						label={<span className="text-sm text-foreground">I agree to the organizer terms & conditions</span>}
					/>
				</div>
			);
		}

		const activeIndex = sessionsOnly ? 4 : logicalIndex;
		switch (activeIndex) {
			case 0:
				return (
					<StepBasicInfo
						state={state}
						categories={categories}
						displayCurrency={displayCurrency}
						onChangeBasicField={handleBasicFieldChange}
						onSetTagInput={(value) => setState((prev) => ({ ...prev, tagInput: value }))}
						onAddTags={(parts) => addTags(parts)}
						onRemoveTag={(tag) => removeTag(tag)}
					/>
				);

			case 1:
				return (
					<StepVisuals
						state={state}
						onHeroFileSelected={onHeroFileSelected}
						onRemoveHero={removeHero}
						onGalleryAddFiles={onGalleryAddFiles}
						onRemoveGalleryItem={(id) => removeGalleryItem(id)}
						heroUploading={uploading.hero}
						galleryUploading={uploading.gallery}
					/>
				);

			case 2:
				return (
					<StepItinerary
						items={state.itinerary}
						onAdd={handleItineraryAdd}
						onImageChange={handleItineraryImageChange}
						onRemoveImage={removeItineraryImage}
						onRemoveStep={removeItineraryStep}
						onUpdateField={updateItineraryField}
						uploading={uploading.itinerary}
					/>
				);

			case 3:
				return (
					<StepMeeting
						meeting={state.meeting}
						countries={countries}
						onChangeAddress={(value) => setState((prev) => ({ ...prev, meeting: { ...prev.meeting, address: value } }))}
						onChangeCountry={(id) => {
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
						onChangeState={(id) =>
							setState((prev) => ({
								...prev,
								meeting: { ...prev.meeting, stateId: id, cityId: "" },
							}))
						}
						onChangeCity={(id) => {
							const selectedCountry = countries.find((c) => c.id === state.meeting.countryId) ?? null;
							const selectedState = selectedCountry?.states.find((s) => s.id === state.meeting.stateId) ?? null;
							const availableCities = selectedState ? selectedState.cities : selectedCountry?.cities ?? [];
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
						onMapLatChange={(value) => setState((prev) => ({ ...prev, meeting: { ...prev.meeting, latitude: value } }))}
						onMapLngChange={(value) => setState((prev) => ({ ...prev, meeting: { ...prev.meeting, longitude: value } }))}
						onMapChange={(lat, lng) => setState((prev) => ({ ...prev, meeting: { ...prev.meeting, latitude: String(lat), longitude: String(lng) } }))}
					/>
				);

			case 4:
				return (
					<StepSessions
						state={state}
						sessions={state.sessions}
						onRemove={(id) => removeSession(id)}
						onUpdateField={(id, key, value) => updateSessionField(id, key, value)}
						onUpdateSession={(id, patch) => updateSession(id, patch)}
						onAddSessionAt={(date) => addSessionAt(date)}
						displayCurrency={displayCurrency}
						maxSessions={MAX_SESSIONS}
					/>
				);

			default:
				return null;
		}
	};

	if (submissionOverlay) {
		return (
			<div className="flex h-full flex-col items-center justify-center px-6 py-10">
				<div className="flex max-w-md flex-col items-center text-center gap-4">
					{submissionOverlay.type === "success" ? <CheckCircle2 className="h-14 w-14 text-emerald-500" /> : <XCircle className="h-14 w-14 text-destructive" />}
					<h2 className="text-xl font-semibold text-foreground">{submissionOverlay.title}</h2>
					<p className="text-sm text-muted-foreground">{submissionOverlay.message}</p>
					<div className="mt-2 flex items-center gap-2">
						{onClose ? (
							<CtaButton color="whiteBorder" onClick={onClose}>
								Close
							</CtaButton>
						) : null}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col">
			<header className="border-b border-border/60 px-6 py-4">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-lg font-semibold text-foreground">{steps[currentStep].title}</h2>
						<p className="text-sm text-muted-foreground">{steps[currentStep].description}</p>
					</div>
					<div className="flex items-center gap-3">
						{message ? <span className="text-xs font-medium text-emerald-600">{message}</span> : null}
						{error ? <span className="text-xs font-medium text-destructive">{error}</span> : null}
						{onClose ? (
							<CtaButton asChild size="sm" color="white" className="ml-2">
								<CtaIconButton color="whiteBorder" size="md" type="button" ariaLabel="Close wizard" onClick={onClose}>
									<X className="h-4 w-4" />
								</CtaIconButton>
							</CtaButton>
						) : null}
					</div>
				</div>
				{!sessionsOnly ? (
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
										? "border-brand bg-brand text-brand-foreground"
										: "border-border/70 text-muted-foreground";
								const lineClasses = step.status === "complete" ? "bg-primary" : step.status === "current" ? "bg-brand/60" : "bg-border/60";
								return (
									<li key={step.title} className={`flex items-center gap-3 ${isLast ? "ml-auto flex-none justify-end" : "flex-1"}`}>
										<div className="flex items-center gap-3">
											<span className={`${circleBase} ${currentClasses}`}>{step.index + 1}</span>
											<div className="min-w-0">
												{(() => {
													const titleClasses = step.status === "current" ? "text-brand" : "text-muted-foreground";
													return <p className={`truncate text-xs font-semibold uppercase tracking-[0.2em] ${titleClasses}`}>{step.title}</p>;
												})()}
											</div>
										</div>
										{isLast ? null : <div className={`${lineBase} ${lineClasses}`} />}
									</li>
								);
							})}
						</ol>
					</nav>
				) : null}
			</header>
			<div className="flex-1 overflow-y-auto px-6 py-6">{renderStepContent()}</div>
			<footer className="border-t border-border/60 bg-muted/40 px-6 py-4">
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<CtaButton color="white" onClick={prevStep} disabled={currentStep === 0}>
						Back
					</CtaButton>
					<div className="flex items-center gap-2">
						{verificationStep?.enabled && currentStep === totalSteps - 1 ? (
							<>
								<CtaButton
									color="whiteBorder"
									onClick={() => {
										approveAfterSaveRef.current = true;
										handleSubmit();
									}}
									disabled={pending}
								>
									Approve
								</CtaButton>
								<CtaButton
									color="whiteBorder"
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
								</CtaButton>
							</>
						) : sessionsOnly ? (
							<CtaButton onClick={handleSubmit} disabled={pending || disabledNext}>
								Update Sessions
							</CtaButton>
						) : currentStep < totalSteps - 1 ? (
							<>
								{canSaveDraft ? (
									<CtaButton color="whiteBorder" onClick={handleSaveDraft} disabled={pending}>
										{pending ? "Saving..." : "Save draft"}
									</CtaButton>
								) : null}
								<CtaButton onClick={nextStep} disabled={disabledNext}>
									{organizerIntro && currentStep === 0 ? "Add your Experience" : "Next"}
								</CtaButton>
							</>
						) : (
							<>
								{canSaveDraft ? (
									<CtaButton color="whiteBorder" onClick={handleSaveDraft} disabled={pending}>
										{pending ? "Saving..." : "Save draft"}
									</CtaButton>
								) : null}
								<CtaButton onClick={handleSubmit} disabled={pending || disabledNext}>
									{pending
										? "Saving..."
										: submissionMode === "organizer-request"
										? "Submit request"
										: verificationStep?.enabled
										? mode === "create"
											? "Submit for verification"
											: "Save changes"
										: "Submit for verification"}
								</CtaButton>
							</>
						)}
					</div>
				</div>
			</footer>
		</div>
	);
}
