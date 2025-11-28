export const EXPERIENCE_RESERVATION_STATUS_EVENT = "experience-reservation-status";

export type ReservationStatusDetail = {
	experienceId: string;
	bookingId: string | null;
	expiresAt: string | null;
};

