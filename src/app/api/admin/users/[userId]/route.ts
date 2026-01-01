import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveUploadedFile } from "@/lib/uploads"
import type { Prisma, UserRole, OrganizerStatus, AccountStatus } from "@/generated/prisma"
import { createNotification } from "@/lib/notifications"

const USER_ROLES = new Set(["EXPLORER", "ORGANIZER", "ADMIN"])
const ORGANIZER_STATUSES = new Set(["NOT_APPLIED", "PENDING", "APPROVED", "REJECTED"])
const ACCOUNT_STATUSES = new Set([
  "PENDING_VERIFICATION",
  "ONBOARDING",
  "ACTIVE",
  "INACTIVE",
  "BANNED",
  "ARCHIVED",
])

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ userId: string }>
  }
) {
  const session = await getServerAuthSession()

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const contentType = request.headers.get("content-type") ?? ""
  const { userId } = await params

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData()

    try {
      const data = await buildUpdateFromFormData(formData, userId)

      if (Object.keys(data).length === 0) {
        return NextResponse.json({ ok: true })
      }

      await prisma.user.update({
        where: { id: userId },
        data,
      })

      return NextResponse.json({ ok: true })
    } catch (error) {
      if (error instanceof Error) {
        return NextResponse.json({ message: error.message }, { status: 400 })
      }
      return NextResponse.json({ message: "Failed to update user" }, { status: 500 })
    }
  }

  const body = await request.json().catch(() => null)

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 })
  }

  const {
    name,
    email,
    headline,
    bio,
    location,
    website,
    phone,
    image,
    role,
    activeRole,
    organizerStatus,
    accountStatus,
    preferredLanguage,
    preferredCurrency,
    preferredTimezone,
    clarification,
  } = body as Record<string, unknown>

  const data: Prisma.UserUpdateInput = {}

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

  if (typeof email === "string") {
    const normalized = email.trim()
    data.email = normalized ? normalized.toLowerCase() : null
  }

  if (typeof role === "string" && USER_ROLES.has(role)) {
    data.role = role as UserRole
  }

  if (typeof activeRole === "string" && USER_ROLES.has(activeRole)) {
    data.activeRole = activeRole as UserRole
  }

  if (typeof organizerStatus === "string" && ORGANIZER_STATUSES.has(organizerStatus)) {
    data.organizerStatus = organizerStatus as OrganizerStatus
  }

  if (typeof accountStatus === "string" && ACCOUNT_STATUSES.has(accountStatus)) {
    data.accountStatus = accountStatus as AccountStatus
  }

  // Capture previous organizer status to decide whether to notify the user
  let prevOrganizerStatus: OrganizerStatus | null = null
  try {
    const existing = await prisma.user.findUnique({ where: { id: userId }, select: { organizerStatus: true } })
    prevOrganizerStatus = (existing?.organizerStatus as OrganizerStatus | undefined) ?? null
  } catch { }

  try {
    await prisma.user.update({
      where: { id: userId },
      data,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: "Failed to update user" }, { status: 500 })
  }

  // Send user notification when organizer request is approved or rejected
  try {
    const nextStatus = typeof organizerStatus === "string" && ORGANIZER_STATUSES.has(organizerStatus) ? (organizerStatus as OrganizerStatus) : null
    if (nextStatus && nextStatus !== prevOrganizerStatus) {
      if (nextStatus === "APPROVED") {
        await createNotification({
          userId,
          title: "Organizer request approved",
          message: typeof clarification === "string" && clarification.trim()
            ? `${clarification.trim()}\n\nYou can now access the organizer console.`
            : "You can now access the organizer console.",
          priority: "NORMAL",
          eventType: "GENERAL",
          channels: ["TOAST"],
          href: "/notifications/organizer-approved",
        })
      } else if (nextStatus === "REJECTED") {
        await createNotification({
          userId,
          title: "Organizer request rejected",
          message:
            typeof clarification === "string" && clarification.trim()
              ? clarification.trim()
              : "Your request was not approved. You can update your details and reapply.",
          priority: "NORMAL",
          eventType: "GENERAL",
          channels: ["TOAST"],
          href: "/become-organizer",
        })
      }
    }
  } catch (error) {
    // Do not fail the request if notification fails; just log.
    console.error("Failed to create notification:", error)
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ userId: string }>
  }
) {
  const session = await getServerAuthSession()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const { userId } = await params

  try {
    await prisma.user.delete({ where: { id: userId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: "Failed to delete user" }, { status: 500 })
  }
}

async function buildUpdateFromFormData(formData: FormData, userId: string) {
  const data: Record<string, unknown> = {}

  const stringFields = ["name", "headline", "bio", "location", "website", "phone"] as const
  const preferenceFields = ["preferredLanguage", "preferredCurrency", "preferredTimezone"] as const
  for (const field of stringFields) {
    const value = getOptionalString(formData, field)
    if (value !== undefined) {
      data[field] = value
    }
  }

  const emailValue = getOptionalString(formData, "email")
  if (emailValue !== undefined) {
    data.email = emailValue ? emailValue.toLowerCase() : null
  }

  const roleValue = getOptionalString(formData, "role")
  if (roleValue && USER_ROLES.has(roleValue)) {
    data.role = roleValue
  }

  const activeRoleValue = getOptionalString(formData, "activeRole")
  if (activeRoleValue && USER_ROLES.has(activeRoleValue)) {
    data.activeRole = activeRoleValue
  }

  const organizerStatusValue = getOptionalString(formData, "organizerStatus")
  if (organizerStatusValue && ORGANIZER_STATUSES.has(organizerStatusValue)) {
    data.organizerStatus = organizerStatusValue
  }

  const accountStatusValue = getOptionalString(formData, "accountStatus")
  if (accountStatusValue && ACCOUNT_STATUSES.has(accountStatusValue)) {
    data.accountStatus = accountStatusValue
  }

  const avatar = formData.get("avatar")
  const removeAvatar = String(formData.get("removeAvatar") ?? "false") === "true"

  for (const field of preferenceFields) {
    const value = getOptionalPreferenceString(formData, field)
    if (value !== undefined) {
      data[field] = value
    }
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

function normalizeString(input: string) {
  const trimmed = input.trim()
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
