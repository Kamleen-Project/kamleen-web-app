import type { OrganizerStatus, UserRole } from "@/generated/prisma"

export type NotificationPreferenceData = {
  toastEnabled: boolean
  pushEnabled: boolean
  emailEnabled: boolean
  onBookingCreated: boolean
  onBookingConfirmed: boolean
  onBookingCancelled: boolean
}

export type UserProfileData = {
  name: string | null
  email: string | null
  headline: string | null
  bio: string | null
  location: string | null
  website: string | null
  phone: string | null
  image: string | null
  preferredLanguage: string
  preferredCurrency: string
  preferredTimezone: string
  notificationPreference?: NotificationPreferenceData
}

export type AdminUserProfileData = UserProfileData & {
  id: string
  role: UserRole
  activeRole: UserRole
  organizerStatus: OrganizerStatus
}
