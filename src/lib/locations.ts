// Shared helpers for composing displayable locations for experiences

export type CountriesInput = {
  id: string;
  name: string;
  states: { id: string; name: string; cities: { id: string; name: string; latitude?: number; longitude?: number }[] }[];
  cities: { id: string; name: string; latitude?: number; longitude?: number }[];
}[];

export type MeetingState = {
  address: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  countryId: string;
  stateId: string;
  cityId: string;
};

export function computeDisplayLocation(meeting: MeetingState, countries: CountriesInput): string {
  const selectedCountryLocal = countries.find((c) => c.id === meeting.countryId) || null;
  const selectedStateLocal = selectedCountryLocal?.states.find((s) => s.id === meeting.stateId) || null;
  const parts = [meeting.city, selectedStateLocal?.name ?? "", meeting.country]
    .filter((p) => Boolean(p && (p as string).trim()));
  return parts.join(", ");
}

export function isMeetingValid(meeting: MeetingState, requiresState: boolean): boolean {
  const addressOk = Boolean((meeting.address || "").trim());
  const countryIdOk = Boolean(meeting.countryId);
  const countryNameOk = Boolean((meeting.country || "").trim());
  const stateIdOk = requiresState ? Boolean(meeting.stateId) : true;
  const cityIdOk = Boolean(meeting.cityId);
  const cityNameOk = Boolean((meeting.city || "").trim());
  const latOk = (meeting.latitude || "").trim().length > 0;
  const lngOk = (meeting.longitude || "").trim().length > 0;
  return addressOk && countryIdOk && countryNameOk && stateIdOk && cityIdOk && cityNameOk && latOk && lngOk;
}


