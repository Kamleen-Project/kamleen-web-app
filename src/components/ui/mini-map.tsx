"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MiniMapProps = {
	latitude?: number | null;
	longitude?: number | null;
	onChange?: (latitude: number, longitude: number) => void;
	className?: string;
	height?: number | string;
	apiKey?: string;
};

declare global {
	// Minimal typing for Google Maps to avoid 'any'
	interface Window {
		google?: {
			maps?: {
				Map: new (el: HTMLElement, options: unknown) => {
					addListener: (event: string, handler: (...args: unknown[]) => void) => void;
					getZoom?: () => number | undefined;
					setCenter: (latlng: { lat: number; lng: number }) => void;
					setZoom: (zoom: number) => void;
				};
				Marker: new (options: { position: { lat: number; lng: number }; map: unknown }) => {
					setPosition: (latlng: { lat: number; lng: number }) => void;
				} | null;
			};
		};
	}
}

function loadGoogleMaps(apiKey: string): Promise<void> {
	if (typeof window === "undefined") return Promise.resolve();
	if (window.google && window.google.maps) return Promise.resolve();
	const existing = document.querySelector<HTMLScriptElement>("script[data-google-maps]");
	if (existing) {
		return new Promise((resolve) => {
			if (window.google && window.google.maps) resolve();
			existing.addEventListener("load", () => resolve());
		});
	}
	return new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=quarterly`;
		script.async = true;
		script.defer = true;
		script.setAttribute("data-google-maps", "true");
		script.onload = () => resolve();
		script.onerror = () => reject(new Error("Failed to load Google Maps JS API"));
		document.body.appendChild(script);
	});
}

export function MiniMap({ latitude, longitude, onChange, className, height = 224, apiKey }: MiniMapProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	type GMap = {
		// Google Maps-like API (optional when using Leaflet)
		addListener?: (event: string, handler: (...args: unknown[]) => void) => void;
		setCenter?: (latlng: { lat: number; lng: number }) => void;
		setZoom?: (zoom: number) => void;
		// Shared
		getZoom?: () => number | undefined;
		// Leaflet-like API (optional when using Google)
		on?: (event: string, handler: (...args: unknown[]) => void) => void;
		off?: () => void;
		remove?: () => void;
		setView?: (latlng: unknown, zoom: number, opts?: unknown) => void;
	} | null;
	type GMarker = {
		setPosition?: (latlng: { lat: number; lng: number }) => void;
		setLatLng?: (latlng: unknown) => void;
		addTo?: (map: unknown) => void;
	} | null;
	const mapRef = useRef<GMap>(null);
	const markerRef = useRef<GMarker>(null);
	const prevHasValidCoordsRef = useRef<boolean>(false);
	const savedZoomRef = useRef<number | null>(null);
	const [loaded, setLoaded] = useState(false);
	const [leafletReady, setLeafletReady] = useState(false);
	const [engine, setEngine] = useState<"google" | "leaflet" | null>(null);

	const hasValidCoords = useMemo(() => {
		return typeof latitude === "number" && Number.isFinite(latitude) && typeof longitude === "number" && Number.isFinite(longitude);
	}, [latitude, longitude]);

	const resolvedKey = apiKey ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

	// Load persisted zoom once on mount
	useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			const raw = window.localStorage.getItem("mini-map-zoom");
			const parsed = raw ? Number.parseInt(raw, 10) : NaN;
			if (Number.isFinite(parsed) && parsed >= 2 && parsed <= 19) {
				savedZoomRef.current = parsed;
			}
		} catch {}
	}, []);

	useEffect(() => {
		let cancelled = false;
		if (!resolvedKey) return;
		loadGoogleMaps(resolvedKey)
			.then(() => {
				if (!cancelled) setLoaded(true);
			})
			.catch(() => {
				// Do not throw; leave as not loaded
			});
		return () => {
			cancelled = true;
		};
	}, [resolvedKey]);

	// Leaflet fallback when no Google API key provided
	useEffect(() => {
		if (resolvedKey) return; // only when no key
		if (typeof window === "undefined") return;
		if ((window as unknown as { L?: unknown }).L) {
			setLeafletReady(true);
			return;
		}
		if (!document.querySelector("link[data-leaflet-css]")) {
			const link = document.createElement("link");
			link.setAttribute("rel", "stylesheet");
			link.setAttribute("href", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
			link.setAttribute("data-leaflet-css", "true");
			document.head.appendChild(link);
		}
		if (!document.querySelector("script[data-leaflet-js]")) {
			const script = document.createElement("script");
			script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
			script.async = true;
			script.setAttribute("data-leaflet-js", "true");
			script.onload = () => setLeafletReady(true);
			document.body.appendChild(script);
		} else {
			const id = window.setInterval(() => {
				if ((window as unknown as { L?: unknown }).L) {
					window.clearInterval(id);
					setLeafletReady(true);
				}
			}, 50);
			return () => window.clearInterval(id);
		}
	}, [resolvedKey]);

	useEffect(() => {
		if (!loaded || !containerRef.current || mapRef.current || !window.google?.maps) return;
		const initialCenter = hasValidCoords ? { lat: latitude as number, lng: longitude as number } : { lat: 20, lng: 0 };
		const initialZoom = savedZoomRef.current ?? (hasValidCoords ? 6 : 2);
		const map = new window.google.maps.Map(containerRef.current, {
			center: initialCenter,
			zoom: initialZoom,
			mapTypeControl: false,
			streetViewControl: false,
			fullscreenControl: false,
		});
		const marker = hasValidCoords ? new window.google.maps.Marker({ position: initialCenter, map }) : null;
		markerRef.current = marker;
		mapRef.current = map;
		map.addListener("click", (event: unknown) => {
			const lat = (event as { latLng: { lat: () => number; lng: () => number } }).latLng.lat();
			const lng = (event as { latLng: { lat: () => number; lng: () => number } }).latLng.lng();
			if (!markerRef.current) {
				const Google = window.google!;
				markerRef.current = new Google.maps!.Marker({ position: { lat, lng }, map });
			} else {
				if (markerRef.current.setPosition) {
					markerRef.current.setPosition({ lat, lng });
				} else if (markerRef.current.setLatLng) {
					markerRef.current.setLatLng([lat, lng]);
				}
			}
			if (onChange) onChange(lat, lng);
		});
		map.addListener("zoom_changed", () => {
			const z = map.getZoom?.();
			if (typeof z === "number") {
				savedZoomRef.current = z;
				try {
					window.localStorage.setItem("mini-map-zoom", String(z));
				} catch {}
			}
		});
		setEngine("google");
		return () => {
			markerRef.current = null;
			mapRef.current = null;
		};
	}, [loaded, hasValidCoords, latitude, longitude, onChange]);

	// Initialize Leaflet map when using fallback
	useEffect(() => {
		if (resolvedKey) return;
		const L: {
			map: (
				el: HTMLElement,
				opts: unknown
			) => {
				on: (event: string, handler: (...args: unknown[]) => void) => void;
				off: () => void;
				remove: () => void;
				getZoom?: () => number;
				setView: (latlng: unknown, zoom: number, opts?: unknown) => void;
			};
			tileLayer: (url: string, opts: unknown) => { addTo: (map: unknown) => void };
			marker: (latlng: unknown) => { addTo: (map: unknown) => void; setLatLng: (latlng: unknown) => void };
			latLng: (lat: number, lng: number) => unknown;
		} = (window as unknown as { L: unknown }).L as {
			map: (
				el: HTMLElement,
				opts: unknown
			) => {
				on: (event: string, handler: (...args: unknown[]) => void) => void;
				off: () => void;
				remove: () => void;
				getZoom?: () => number;
				setView: (latlng: unknown, zoom: number, opts?: unknown) => void;
			};
			tileLayer: (url: string, opts: unknown) => { addTo: (map: unknown) => void };
			marker: (latlng: unknown) => { addTo: (map: unknown) => void; setLatLng: (latlng: unknown) => void };
			latLng: (lat: number, lng: number) => unknown;
		};
		if (!leafletReady || !L || !containerRef.current || mapRef.current) return;
		const initialCenter = hasValidCoords ? [latitude as number, longitude as number] : [20, 0];
		const initialZoom = savedZoomRef.current ?? (hasValidCoords ? 6 : 2);
		const map = L.map(containerRef.current, {
			center: initialCenter,
			zoom: initialZoom,
			zoomControl: true,
			attributionControl: true,
		});
		L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution: "&copy; OpenStreetMap contributors",
			maxZoom: 19,
		}).addTo(map);
		const markerObj = hasValidCoords ? L.marker(initialCenter) : null;
		if (markerObj) {
			markerObj.addTo(map);
		}
		markerRef.current = markerObj;
		mapRef.current = map;
		map.on("click", ((...args: unknown[]) => {
			const event = args[0] as { latlng: { lat: number; lng: number } };
			const lat = event.latlng.lat as number;
			const lng = event.latlng.lng as number;
			if (!markerRef.current) {
				const created = L.marker([lat, lng]);
				created.addTo(map);
				markerRef.current = created;
			} else {
				if (markerRef.current && markerRef.current.setLatLng) {
					markerRef.current.setLatLng([lat, lng]);
				} else if (markerRef.current && markerRef.current.setPosition) {
					markerRef.current.setPosition({ lat, lng });
				}
			}
			if (onChange) onChange(lat, lng);
		}) as (...args: unknown[]) => void);
		map.on("zoomend", () => {
			const z = map.getZoom?.();
			if (typeof z === "number") {
				savedZoomRef.current = z;
				try {
					window.localStorage.setItem("mini-map-zoom", String(z));
				} catch {}
			}
		});
		setEngine("leaflet");
		return () => {
			if (map && map.off) map.off();
			if (map && map.remove) map.remove();
			mapRef.current = null;
			markerRef.current = null;
		};
	}, [leafletReady, resolvedKey, hasValidCoords, latitude, longitude, onChange]);

	useEffect(() => {
		if (!mapRef.current) return;
		if (engine === "google" && window.google?.maps && hasValidCoords) {
			const latlng = { lat: latitude as number, lng: longitude as number };
			if (!markerRef.current) {
				markerRef.current = new window.google.maps.Marker({ position: latlng, map: mapRef.current });
			} else {
				if (markerRef.current.setPosition) {
					markerRef.current.setPosition(latlng as { lat: number; lng: number });
				} else if (markerRef.current.setLatLng) {
					markerRef.current.setLatLng(latlng);
				}
			}
			const currentZoom = mapRef.current?.getZoom?.() ?? 6;
			mapRef.current?.setCenter?.(latlng);
			// If coordinates became valid for the first time (e.g., on city selection), zoom in; otherwise, preserve current zoom
			if (!prevHasValidCoordsRef.current && hasValidCoords) {
				mapRef.current?.setZoom?.(12);
			} else {
				mapRef.current?.setZoom?.(currentZoom);
			}
			prevHasValidCoordsRef.current = hasValidCoords;
		}
		if (engine === "leaflet" && (window as unknown as { L?: unknown }).L && hasValidCoords) {
			const L = (window as unknown as { L: unknown }).L as unknown as {
				marker: (latlng: unknown) => { addTo: (map: unknown) => void; setLatLng: (latlng: unknown) => void };
				latLng: (lat: number, lng: number) => unknown;
			};
			const latlng = L.latLng(latitude as number, longitude as number);
			if (!markerRef.current) {
				const created = L.marker(latlng);
				created.addTo(mapRef.current);
				markerRef.current = created;
			} else {
				if (markerRef.current && markerRef.current.setLatLng) {
					markerRef.current.setLatLng(latlng);
				} else if (markerRef.current && markerRef.current.setPosition) {
					markerRef.current.setPosition(latlng as { lat: number; lng: number });
				}
			}
			const currentZoom = mapRef.current?.getZoom?.() ?? 6;
			const nextZoom = !prevHasValidCoordsRef.current && hasValidCoords ? 12 : currentZoom;
			mapRef.current?.setView?.(latlng, nextZoom, { animate: true });
			prevHasValidCoordsRef.current = hasValidCoords;
		}
	}, [engine, hasValidCoords, latitude, longitude]);

	return (
		<div
			ref={containerRef}
			className={className}
			style={{ height: typeof height === "number" ? `${height}px` : height, width: "100%", borderRadius: 12, overflow: "hidden" }}
		/>
	);
}
