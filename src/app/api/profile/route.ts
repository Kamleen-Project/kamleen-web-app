import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveUploadedFile } from "@/lib/uploads"

type PrefPatch = {
  toastEnabled?: boolean
  pushEnabled?: boolean
  emailEnabled?: boolean
  onBookingCreated?: boolean
  onBookingConfirmed?: boolean
  onBookingCancelled?: boolean
  onExperiencePublished?: boolean
  onExperienceUnpublished?: boolean
  onVerificationApproved?: boolean
  onVerificationRejected?: boolean
}

function buildNotificationPreferenceUpsert(patch: PrefPatch) {
  return {
    upsert: {
      update: patch,
      create: { ...patch },
    },
  }
}

export async function PATCH(request: Request) {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const contentType = request.headers.get("content-type") ?? ""

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData()

    try {
      const data = await buildUpdateFromFormData(formData, session.user.id)

      if (Object.keys(data).length === 0) {
        return NextResponse.json({ ok: true })
      }

      // Adjust account status at this checkpoint
      const current = await prisma.user.findUnique({ where: { id: session.user.id }, select: { emailVerified: true, onboardingCompletedAt: true, accountStatus: true } })
      if (current) {
        const locked = current.accountStatus === "BANNED" || current.accountStatus === "ARCHIVED"
        const nextStatus = locked
          ? current.accountStatus
          : current.emailVerified
          ? current.onboardingCompletedAt
            ? "ACTIVE"
            : "ONBOARDING"
          : "PENDING_VERIFICATION"
        ;(data as { accountStatus?: string }).accountStatus = nextStatus
      }

      // Enforce required fields during onboarding: gender and birthDate when accepting terms
      const acceptingTerms = (data as { termsAcceptedAt?: Date | null }).termsAcceptedAt instanceof Date
      if (acceptingTerms) {
        const gender = (data as { gender?: string | null }).gender
        const birthDate = (data as { birthDate?: Date | null }).birthDate
        if (!gender || !isAllowedGender(String(gender))) {
          throw new Error("Gender is required during onboarding")
        }
        if (!(birthDate instanceof Date) || isNaN((birthDate as Date).getTime())) {
          throw new Error("Birth date is required during onboarding")
        }
      }

      await prisma.user.update({ where: { id: session.user.id }, data })

      return NextResponse.json({ ok: true })
    } catch (error) {
      if (error instanceof Error) {
        return NextResponse.json({ message: error.message }, { status: 400 })
      }
      return NextResponse.json({ message: "Unable to update profile" }, { status: 500 })
    }
  }

  const body = await request.json().catch(() => null)

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 })
  }

  const { name, headline, bio, location, website, phone, image, preferredLanguage, preferredCurrency, preferredTimezone, birthDate, acceptTerms } = body as Record<string, unknown>

  const data: Record<string, string | null | unknown> = {}

  if (typeof name === "string") data.name = normalizeString(name)
  if (typeof headline === "string") data.headline = normalizeString(headline)
  if (typeof bio === "string") data.bio = normalizeString(bio)
  if (typeof location === "string") data.location = normalizeString(location)
  if (typeof website === "string") data.website = normalizeString(website)
  if (typeof phone === "string") data.phone = normalizeString(phone)
  if (typeof image === "string") data.image = normalizeString(image)
  if (typeof birthDate === "string" && birthDate.trim()) {
    const date = new Date(birthDate)
    if (!isNaN(date.getTime())) {
      ;(data as { birthDate?: Date | null }).birthDate = date
    }
  }
  if (acceptTerms === true || String(acceptTerms).toLowerCase() === "true") {
    ;(data as { termsAcceptedAt?: Date | null }).termsAcceptedAt = new Date()
  }
  if (typeof preferredLanguage === "string") {
    const normalized = normalizePreference(preferredLanguage)
    if (normalized !== undefined) data.preferredLanguage = normalized
  }
  if (typeof preferredCurrency === "string") {
    const normalized = normalizePreference(preferredCurrency)
    if (normalized !== undefined) data.preferredCurrency = normalized
  }
  if (typeof preferredTimezone === "string") {
    const normalized = normalizePreference(preferredTimezone)
    if (normalized !== undefined) data.preferredTimezone = normalized
  }

  // Optional gender in JSON body
  if (typeof (body as Record<string, unknown>).gender === "string") {
    const normalized = String((body as Record<string, unknown>).gender).toUpperCase().trim()
    if (isAllowedGender(normalized)) {
      ;(data as { gender?: string | null }).gender = normalized
    }
  }

  // Optional notification preferences in JSON body
  const prefKeys = [
    "toastEnabled",
    "pushEnabled",
    "emailEnabled",
    "onBookingCreated",
    "onBookingConfirmed",
    "onBookingCancelled",
    "onExperiencePublished",
    "onExperienceUnpublished",
    "onVerificationApproved",
    "onVerificationRejected",
  ] as const
  const prefPatch: PrefPatch = {}
  for (const key of prefKeys) {
    const v = (body as Record<string, unknown>)[key]
    if (typeof v === "boolean") {
      prefPatch[key] = v
    } else if (typeof v === "string") {
      const normalized = v.toLowerCase()
      prefPatch[key] = normalized === "true" || normalized === "1" || normalized === "on"
    }
  }
  if (Object.keys(prefPatch).length > 0) {
    ;(data as { notificationPreference?: unknown }).notificationPreference = buildNotificationPreferenceUpsert(
      prefPatch
    )
  }

  const current = await prisma.user.findUnique({ where: { id: session.user.id }, select: { emailVerified: true, onboardingCompletedAt: true, accountStatus: true } })
  if (current) {
    const locked = current.accountStatus === "BANNED" || current.accountStatus === "ARCHIVED"
    const nextStatus = locked
      ? current.accountStatus
      : current.emailVerified
      ? current.onboardingCompletedAt
        ? "ACTIVE"
        : "ONBOARDING"
      : "PENDING_VERIFICATION"
    ;(data as { accountStatus?: string }).accountStatus = nextStatus
  }

  await prisma.user.update({ where: { id: session.user.id }, data })

  return NextResponse.json({ ok: true })
}

async function buildUpdateFromFormData(formData: FormData, userId: string) {
  const data: Record<string, string | null | unknown> = {}

  const stringFields = ["name", "headline", "bio", "location", "website", "phone"] as const
  const birthDateStr = getOptionalString(formData, "birthDate")
  if (birthDateStr) {
    const dt = new Date(birthDateStr)
    if (!isNaN(dt.getTime())) {
      ;(data as { birthDate?: Date | null }).birthDate = dt
    }
  }
  const acceptTermsValues = formData.getAll("acceptTerms")
  if (acceptTermsValues.length > 0) {
    const anyTrue = acceptTermsValues.some((v) => {
      const normalized = String(v ?? "").toLowerCase()
      return normalized === "true" || normalized === "1" || normalized === "on"
    })
    if (anyTrue) {
      ;(data as { termsAcceptedAt?: Date | null }).termsAcceptedAt = new Date()
    }
  }
  const preferenceFields = ["preferredLanguage", "preferredCurrency", "preferredTimezone"] as const
  for (const field of stringFields) {
    const value = getOptionalString(formData, field)
    if (value !== undefined) {
      data[field] = value
    }
  }

  const avatar = formData.get("avatar")
  const removeAvatar = String(formData.get("removeAvatar") ?? "false") === "true"

  for (const field of preferenceFields) {
    const value = getOptionalPreferenceString(formData, field)
    if (value !== undefined) {
      data[field] = value
    }
  }

  // Optional gender via form-data (radio group)
  const genderRaw = getOptionalString(formData, "gender")
  if (genderRaw !== undefined) {
    const normalized = (genderRaw ?? "").toUpperCase()
    if (isAllowedGender(normalized)) {
      ;(data as { gender?: string | null }).gender = normalized
    } else if (genderRaw === null) {
      ;(data as { gender?: string | null }).gender = null
    }
  }

  // Optional notification preferences via form-data (checkboxes)
  const prefKeys = [
    "toastEnabled",
    "pushEnabled",
    "emailEnabled",
    "onBookingCreated",
    "onBookingConfirmed",
    "onBookingCancelled",
    "onExperiencePublished",
    "onExperienceUnpublished",
    "onVerificationApproved",
    "onVerificationRejected",
  ] as const
  const prefData: PrefPatch = {}
  for (const key of prefKeys) {
    // We render a hidden=false and a checkbox=true with the same name.
    // Use getAll to detect any true value; absence means do not update this key.
    const values = formData.getAll(key)
    if (values.length > 0) {
      const anyTrue = values.some((val) => {
        const normalized = String(val ?? "").toLowerCase()
        return normalized === "true" || normalized === "1" || normalized === "on"
      })
      prefData[key] = anyTrue
    }
  }
  if (Object.keys(prefData).length > 0) {
    ;(data as { notificationPreference?: unknown }).notificationPreference = buildNotificationPreferenceUpsert(
      prefData
    )
  }

  if (avatar instanceof File && avatar.size > 0) {
    const stored = await saveUploadedFile({ file: avatar, directory: `avatars/${userId}` })
    data.image = stored.publicPath
  } else if (removeAvatar) {
    data.image = null
  }

  return data
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== "string") {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeString(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizePreference(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function getOptionalPreferenceString(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== "string") {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function isAllowedGender(value: string) {
  return value === "MALE" || value === "FEMALE" || value === "RATHER_NOT_SAY"
}
