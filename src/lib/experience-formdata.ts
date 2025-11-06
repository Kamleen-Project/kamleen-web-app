import { formatDuration } from "@/lib/duration";
import { computeDisplayLocation, type CountriesInput } from "@/lib/locations";
import type { WizardState, ItineraryItem as WizardItineraryItem, SessionItem as WizardSessionItem, ImageItem as WizardImageItem } from "@/types/experience-wizard";

// CountriesInput imported from locations

type BuildOptions = {
  mode: "create" | "edit";
  countries: CountriesInput;
  // When true, status will be set to DRAFT on the payload
  forceDraftStatus?: boolean;
  // Include removals arrays for gallery/images
  includeRemovals?: boolean;
  // When true, only append user-entered fields if present (for draft saves)
  lenientDraftFields?: boolean;
};

// Use shared wizard types
export type WizardLikeState = WizardState;

// computeDisplayLocation is centralized in lib/locations

export function buildExperienceFormData(state: WizardLikeState, options: BuildOptions): FormData {
  const { mode, countries, forceDraftStatus = false, includeRemovals = true, lenientDraftFields = false } = options;

  const formData = new FormData();

  if (!lenientDraftFields || state.title.trim()) formData.append("title", state.title.trim());
  if (!lenientDraftFields || state.summary.trim()) formData.append("summary", state.summary.trim());
  formData.append("duration", formatDuration(state.durationDays, state.durationHours, state.durationMinutes));
  if (state.description.trim()) formData.append("description", state.description.trim());
  formData.append("audience", state.audience);
  // price: on drafts preserve current value (default 0)
  formData.append("price", (lenientDraftFields ? (state.price.trim() || "0") : state.price.trim()));
  if (!lenientDraftFields || state.category.trim()) formData.append("category", state.category);
  if (state.categoryId) formData.append("categoryId", state.categoryId);

  const displayLocation = computeDisplayLocation(state.meeting, countries);
  formData.append("location", displayLocation);

  if (state.tags.length) formData.append("tags", state.tags.join(","));

  if (state.hero.file) {
    formData.append("heroImage", state.hero.file);
  }
  if (mode === "edit" && state.hero.removed && !state.hero.file) {
    formData.append("removeHero", "true");
  }

  const galleryRemove = state.gallery.filter((item: WizardImageItem) => item.status === "existing" && item.removed);
  const galleryNew = state.gallery.filter((item: WizardImageItem) => item.status === "new" && !item.removed);

  if (includeRemovals && galleryRemove.length) {
    formData.append("removeGallery", JSON.stringify(galleryRemove.map((item) => item.id)));
  }

  for (const item of galleryNew) {
    if (item.file) formData.append("galleryImages", item.file);
  }

  if (!lenientDraftFields || state.meeting.address) formData.append("meetingAddress", state.meeting.address);
  if (!lenientDraftFields || state.meeting.city) formData.append("meetingCity", state.meeting.city);
  if (!lenientDraftFields || state.meeting.country) formData.append("meetingCountry", state.meeting.country);
  if (state.meeting.countryId) formData.append("countryId", state.meeting.countryId);
  if (state.meeting.stateId) formData.append("stateId", state.meeting.stateId);
  if (state.meeting.cityId) formData.append("cityId", state.meeting.cityId);
  if (!lenientDraftFields || state.meeting.latitude) formData.append("meetingLatitude", state.meeting.latitude);
  if (!lenientDraftFields || state.meeting.longitude) formData.append("meetingLongitude", state.meeting.longitude);

  const itineraryMeta = state.itinerary
    .filter((item) => !item.removed)
    .map((item, index) => {
      const meta: Record<string, unknown> = {
        order: index,
        title: item.title.trim(),
        subtitle: item.subtitle.trim(),
      };
      const label = formatDuration("0", item.durationHours, item.durationMinutes, { zeroIsEmpty: true });
      if (label) (meta as Record<string, unknown>).duration = label;
      if (mode === "edit" && item.status === "existing") meta.id = item.id;
      if (item.file) {
        const key = `itineraryImage-${item.id}`;
        (meta as Record<string, unknown>).imageKey = key;
        formData.append(key, item.file);
      } else if (item.url) {
        (meta as Record<string, unknown>).imageUrl = item.url;
      }
      return meta;
    });

  formData.append("itinerary", JSON.stringify(itineraryMeta));

  const sessionsMeta = state.sessions.map((session) => {
    const isDifferent = Boolean(session.useDifferentLocation);
    const hasDifferentPrice = Boolean(session.useDifferentPrice);
    const useDifferentDuration = Boolean(session.useDifferentDuration);
    return {
      id: mode === "edit" && session.status === "existing" ? session.id : undefined,
      startAt: new Date(session.startAt).toISOString(),
      duration: useDifferentDuration ? formatDuration(session.durationDays, session.durationHours, session.durationMinutes) : null,
      capacity: Number.parseInt(session.capacity || "0", 10) || 0,
      priceOverride: hasDifferentPrice && session.priceOverride ? Number.parseInt(session.priceOverride, 10) : null,
      meetingAddress: isDifferent && session.meetingAddress ? session.meetingAddress.trim() : null,
      meetingLatitude: isDifferent && session.meetingLatitude && session.meetingLatitude.trim() ? Number.parseFloat(session.meetingLatitude) : null,
      meetingLongitude: isDifferent && session.meetingLongitude && session.meetingLongitude.trim() ? Number.parseFloat(session.meetingLongitude) : null,
    };
  });

  formData.append("sessions", JSON.stringify(sessionsMeta));

  if (forceDraftStatus) {
    formData.set("status", "DRAFT");
  }

  return formData;
}


