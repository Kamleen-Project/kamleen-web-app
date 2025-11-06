/* eslint @typescript-eslint/no-explicit-any: 0 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MapLatLngProps = {
	lat: string;
	lng: string;
	onLatChange: (value: string) => void;
	onLngChange: (value: string) => void;
	onMapChange?: (lat: number, lng: number) => void;
	height?: number;
	// Optional aspect ratio for the map container; when provided, overrides height
	aspect?: "square" | "sixteenNine" | "fourFive" | "twoOne";
	labels?: { lat?: string; lng?: string };
	required?: boolean;
	hint?: string;
};

declare global {
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

export function MapLatLng({ lat, lng, onLatChange, onLngChange, onMapChange, height = 360, aspect, labels, required, hint }: MapLatLngProps) {
	const latNum = lat?.trim() ? Number.parseFloat(lat) : null;
	const lngNum = lng?.trim() ? Number.parseFloat(lng) : null;

	const containerRef = useRef<HTMLDivElement | null>(null);
	type GMap = {
		addListener?: (event: string, handler: (...args: unknown[]) => void) => void;
		setCenter?: (latlng: { lat: number; lng: number }) => void;
		setZoom?: (zoom: number) => void;
		getZoom?: () => number | undefined;
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
		return typeof latNum === "number" && Number.isFinite(latNum) && typeof lngNum === "number" && Number.isFinite(lngNum);
	}, [latNum, lngNum]);

	const resolvedKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

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
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [resolvedKey]);

	// Leaflet fallback
	useEffect(() => {
		if (resolvedKey) return;
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

	// Init Google map
	useEffect(() => {
		if (!loaded || !containerRef.current || mapRef.current || !window.google?.maps) return;
		const initialCenter = hasValidCoords ? { lat: latNum as number, lng: lngNum as number } : { lat: 20, lng: 0 };
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
			const newLat = (event as { latLng: { lat: () => number; lng: () => number } }).latLng.lat();
			const newLng = (event as { latLng: { lat: () => number; lng: () => number } }).latLng.lng();
			if (!markerRef.current) {
				const Google = window.google!;
				markerRef.current = new Google.maps!.Marker({ position: { lat: newLat, lng: newLng }, map });
			} else {
				if (markerRef.current.setPosition) {
					markerRef.current.setPosition({ lat: newLat, lng: newLng });
				} else if (markerRef.current.setLatLng) {
					markerRef.current.setLatLng([newLat, newLng]);
				}
			}
			if (onMapChange) onMapChange(newLat, newLng);
			else {
				onLatChange(String(newLat));
				onLngChange(String(newLng));
			}
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
	}, [loaded, hasValidCoords, latNum, lngNum, onMapChange, onLatChange, onLngChange]);

	// Init Leaflet
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
		} = (window as unknown as { L: unknown }).L as any;
		if (!leafletReady || !L || !containerRef.current || mapRef.current) return;
		const initialCenter = hasValidCoords ? [latNum as number, lngNum as number] : [20, 0];
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
		if (markerObj) markerObj.addTo(map);
		markerRef.current = markerObj;
		mapRef.current = map as unknown as GMap;
		map.on("click", ((...args: unknown[]) => {
			const event = args[0] as { latlng: { lat: number; lng: number } };
			const newLat = event.latlng.lat as number;
			const newLng = event.latlng.lng as number;
			if (!markerRef.current) {
				const created = L.marker([newLat, newLng]);
				created.addTo(map);
				markerRef.current = created;
			} else {
				if (markerRef.current && markerRef.current.setLatLng) {
					markerRef.current.setLatLng([newLat, newLng]);
				} else if (markerRef.current && markerRef.current.setPosition) {
					markerRef.current.setPosition({ lat: newLat, lng: newLng });
				}
			}
			if (onMapChange) onMapChange(newLat, newLng);
			else {
				onLatChange(String(newLat));
				onLngChange(String(newLng));
			}
		}) as (...args: unknown[]) => void);
		map.on("zoomend", () => {
			const z = (map as any).getZoom?.();
			if (typeof z === "number") {
				savedZoomRef.current = z;
				try {
					window.localStorage.setItem("mini-map-zoom", String(z));
				} catch {}
			}
		});
		setEngine("leaflet");
		return () => {
			if ((map as any).off) (map as any).off();
			if ((map as any).remove) (map as any).remove();
			mapRef.current = null;
			markerRef.current = null;
		};
	}, [leafletReady, resolvedKey, hasValidCoords, latNum, lngNum, onMapChange, onLatChange, onLngChange]);

	// Respond to lat/lng changes
	useEffect(() => {
		if (!mapRef.current) return;
		if (engine === "google" && window.google?.maps && hasValidCoords) {
			const latlng = { lat: latNum as number, lng: lngNum as number };
			if (!markerRef.current) {
				markerRef.current = new window.google.maps.Marker({ position: latlng, map: mapRef.current });
			} else {
				if (markerRef.current.setPosition) markerRef.current.setPosition(latlng);
				else if (markerRef.current.setLatLng) markerRef.current.setLatLng(latlng as any);
			}
			const currentZoom = mapRef.current?.getZoom?.() ?? 6;
			mapRef.current?.setCenter?.(latlng);
			if (!prevHasValidCoordsRef.current && hasValidCoords) {
				mapRef.current?.setZoom?.(12);
			} else {
				mapRef.current?.setZoom?.(currentZoom as number);
			}
			prevHasValidCoordsRef.current = hasValidCoords;
		}
		if (engine === "leaflet" && (window as any).L && hasValidCoords) {
			const L = (window as any).L as { marker: (latlng: any) => any; latLng: (lat: number, lng: number) => any };
			const latlng = L.latLng(latNum as number, lngNum as number);
			if (!markerRef.current) {
				const created = L.marker(latlng);
				created.addTo(mapRef.current);
				markerRef.current = created;
			} else {
				if (markerRef.current.setLatLng) markerRef.current.setLatLng(latlng);
				else if (markerRef.current.setPosition) markerRef.current.setPosition(latlng);
			}
			const currentZoom = mapRef.current?.getZoom?.() ?? 6;
			const nextZoom = !prevHasValidCoordsRef.current && hasValidCoords ? 12 : (currentZoom as number);
			mapRef.current?.setView?.(latlng, nextZoom, { animate: true });
			prevHasValidCoordsRef.current = hasValidCoords;
		}
	}, [engine, hasValidCoords, latNum, lngNum, onLatChange, onLngChange]);

	return (
		<div className="space-y-2">
			<div className="rounded-xl border border-border/60">
				{aspect ? (
					<div
						className={`${(() => {
							if (aspect === "square") return "relative w-full aspect-square";
							if (aspect === "sixteenNine") return "relative w-full aspect-[16/9]";
							if (aspect === "fourFive") return "relative w-full aspect-[4/5]";
							if (aspect === "twoOne") return "relative w-full aspect-[2/1]";
							return "relative w-full aspect-[16/9]";
						})()}`}
					>
						<div ref={containerRef} className="absolute inset-0" style={{ borderRadius: 12, overflow: "hidden" }} />
					</div>
				) : (
					<div ref={containerRef} style={{ height: `${height}px`, width: "100%", borderRadius: 12, overflow: "hidden" }} />
				)}
			</div>
			{hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
		</div>
	);
}

export default MapLatLng;
