"use client";

import { MiniMap } from "@/components/ui/mini-map";
import { InputField } from "@/components/ui/input-field";

type MapLatLngProps = {
	lat: string;
	lng: string;
	onLatChange: (value: string) => void;
	onLngChange: (value: string) => void;
	onMapChange?: (lat: number, lng: number) => void;
	height?: number;
	labels?: { lat?: string; lng?: string };
	required?: boolean;
	hint?: string;
};

export function MapLatLng({ lat, lng, onLatChange, onLngChange, onMapChange, height = 360, labels, required, hint }: MapLatLngProps) {
	const latNum = lat?.trim() ? Number.parseFloat(lat) : null;
	const lngNum = lng?.trim() ? Number.parseFloat(lng) : null;

	return (
		<div className="space-y-2">
			<div className="grid gap-4 sm:grid-cols-3">
				<div className="sm:col-span-2 rounded-xl border border-border/60">
					<MiniMap
						latitude={latNum}
						longitude={lngNum}
						onChange={(newLat, newLng) => {
							if (onMapChange) onMapChange(newLat, newLng);
							else {
								onLatChange(String(newLat));
								onLngChange(String(newLng));
							}
						}}
						height={height}
					/>
				</div>
				<div className="space-y-2">
					<InputField
						label={
							<>
								{labels?.lat ?? "Latitude"} {required ? <span className="text-destructive">*</span> : null}
							</>
						}
						value={lat}
						onChange={(e) => onLatChange(e.target.value)}
						placeholder="e.g., 37.7749"
						required={required}
					/>
					<InputField
						label={
							<>
								{labels?.lng ?? "Longitude"} {required ? <span className="text-destructive">*</span> : null}
							</>
						}
						value={lng}
						onChange={(e) => onLngChange(e.target.value)}
						placeholder="e.g., -122.4194"
						required={required}
					/>
				</div>
			</div>
			{hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
		</div>
	);
}

export default MapLatLng;
