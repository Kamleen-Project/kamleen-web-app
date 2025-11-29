import { getServerAuthSession } from "./auth"
import { prisma } from "./prisma"

type PreferenceLabels = {
  languageLabel: string
  currencyLabel: string
  timezoneLabel: string
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
}

const CURRENCY_LABELS: Record<string, string> = {
  MAD: "Moroccan Dirham",
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  CAD: "Canadian Dollar",
  AUD: "Australian Dollar",
  AED: "UAE Dirham",
}

const TIMEZONE_LABELS: Record<string, string> = {
  UTC: "Coordinated Universal Time",
  "America/New_York": "New York (UTC-05:00)",
  "America/Los_Angeles": "Los Angeles (UTC-08:00)",
  "Europe/London": "London (UTC+00:00)",
  "Europe/Paris": "Paris (UTC+01:00)",
  "Asia/Dubai": "Dubai (UTC+04:00)",
  "Asia/Tokyo": "Tokyo (UTC+09:00)",
}

export type UserPreferencesData = {
  preferredLanguage: string
  preferredCurrency: string
  preferredTimezone: string
}

export async function getUserSettingsData() {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      preferredLanguage: true,
      preferredCurrency: true,
      preferredTimezone: true,
    },
  })

  if (!user) {
    return null
  }

  return user
}

export function formatUserPreferences(user: UserPreferencesData | null): PreferenceLabels {
  if (!user) {
    return {
      languageLabel: "English",
      currencyLabel: "Moroccan Dirham",
      timezoneLabel: "Coordinated Universal Time",
    }
  }

  return {
    languageLabel: LANGUAGE_LABELS[user.preferredLanguage] ?? user.preferredLanguage,
    currencyLabel: CURRENCY_LABELS[user.preferredCurrency] ?? user.preferredCurrency,
    timezoneLabel: TIMEZONE_LABELS[user.preferredTimezone] ?? user.preferredTimezone,
  }
}

