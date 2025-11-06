// Shared types for Experience Wizard state across UI and builders

export type ImageItem = {
  id: string;
  status: "existing" | "new";
  url?: string;
  file?: File;
  preview?: string | null;
  removed?: boolean;
};

export type ItineraryItem = {
  id: string;
  status: "existing" | "new";
  title: string;
  subtitle: string;
  url?: string;
  file?: File;
  preview?: string | null;
  removed?: boolean;
  durationHours?: string;
  durationMinutes?: string;
};

export type SessionItem = {
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

export type WizardState = {
  title: string;
  summary: string;
  description: string;
  category: string;
  categoryId: string;
  duration: string;
  durationDays: string;
  durationHours: string;
  durationMinutes: string;
  price: string;
  location: string;
  tags: string[];
  tagInput: string;
  hero: { url: string | null; file: File | null; preview: string | null; removed: boolean };
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
  organizerAboutSelf?: string;
  organizerAboutExperience?: string;
  organizerTermsAccepted?: boolean;
};


