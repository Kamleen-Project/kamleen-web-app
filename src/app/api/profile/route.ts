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

      await prisma.user.update({
        where: { id: session.user.id },
        data,
      })

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

  const { name, headline, bio, location, website, phone, image, preferredLanguage, preferredCurrency, preferredTimezone } = body as Record<string, unknown>

  const data: Record<string, string | null | unknown> = {}

  if (typeof name === "string") data.name = normalizeString(name)
  if (typeof headline === "string") data.headline = normalizeString(headline)
  if (typeof bio === "string") data.bio = normalizeString(bio)
  if (typeof location === "string") data.location = normalizeString(location)
  if (typeof website === "string") data.website = normalizeString(website)
  if (typeof phone === "string") data.phone = normalizeString(phone)
  if (typeof image === "string") data.image = normalizeString(image)
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

  await prisma.user.update({
    where: { id: session.user.id },
    data,
  })

  return NextResponse.json({ ok: true })
}

async function buildUpdateFromFormData(formData: FormData, userId: string) {
  const data: Record<string, string | null | unknown> = {}

  const stringFields = ["name", "headline", "bio", "location", "website", "phone"] as const
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
