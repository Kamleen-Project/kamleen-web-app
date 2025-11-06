"use client";

import { InputField } from "@/components/ui/input-field";
import { SelectField } from "@/components/ui/select-field";
import { MapLatLng } from "@/components/ui/map-latlng";
import type { CountriesInput } from "@/lib/locations";
import type { WizardState } from "@/types/experience-wizard";

export type StepMeetingProps = {
	meeting: WizardState["meeting"];
	countries: CountriesInput;
	onChangeAddress: (value: string) => void;
	onChangeCountry: (countryId: string) => void;
	onChangeState: (stateId: string) => void;
	onChangeCity: (cityId: string) => void;
	onMapLatChange: (value: string) => void;
	onMapLngChange: (value: string) => void;
	onMapChange: (lat: number, lng: number) => void;
};

export default function StepMeeting({
	meeting,
	countries,
	onChangeAddress,
	onChangeCountry,
	onChangeState,
	onChangeCity,
	onMapLatChange,
	onMapLngChange,
	onMapChange,
}: StepMeetingProps) {
	const selectedCountry = countries.find((c) => c.id === meeting.countryId) ?? null;
	const availableStates = selectedCountry?.states ?? [];
	const selectedState = availableStates.find((s) => s.id === meeting.stateId) ?? null;
	const availableCities = selectedState ? selectedState.cities : selectedCountry?.cities ?? [];

	return (
		<div className="space-y-6">
			<InputField
				label={"Address"}
				value={meeting.address}
				onChange={(event) => onChangeAddress(event.target.value)}
				placeholder="Street and number"
				required
			/>
			<div className="grid gap-4 sm:grid-cols-3">
				<div className="flex flex-col gap-2">
					<div className="space-y-2 mb-4">
						<SelectField label={"Country"} value={meeting.countryId} required onChange={(event) => onChangeCountry(event.target.value)}>
							<option value="">Select a country</option>
							{countries.map((country) => (
								<option key={country.id} value={country.id}>
									{country.name}
								</option>
							))}
						</SelectField>
					</div>
					<div className="space-y-2 mb-4">
						<SelectField
							label={"State/Region"}
							value={meeting.stateId}
							onChange={(event) => onChangeState(event.target.value)}
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
					<div className="space-y-2 mb-4">
						<SelectField label={"City"} value={meeting.cityId} onChange={(event) => onChangeCity(event.target.value)} disabled={!selectedCountry} required>
							<option value="">{availableCities.length ? "Select a city" : "No cities"}</option>
							{availableCities.map((city) => (
								<option key={city.id} value={city.id}>
									{city.name}
								</option>
							))}
						</SelectField>
					</div>
				</div>
				<div className="flex flex-col gap-2 col-span-2">
					<MapLatLng
						aspect="twoOne"
						lat={meeting.latitude}
						lng={meeting.longitude}
						onLatChange={(value) => onMapLatChange(value)}
						onLngChange={(value) => onMapLngChange(value)}
						onMapChange={(lat, lng) => onMapChange(lat, lng)}
						height={360}
						required
						hint={
							process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
								? "Click the map to set a pin and update coordinates."
								: "Add coordinates to preview a map, or set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for interactive pinning."
						}
					/>
				</div>
			</div>
		</div>
	);
}
