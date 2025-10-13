import { EventEmitter } from "events"

import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

type NotificationPayload = {
  userId: string
  title: string
  message: string
  priority?: "LOW" | "NORMAL" | "HIGH"
  eventType?:
    | "BOOKING_CREATED"
    | "BOOKING_CONFIRMED"
    | "BOOKING_CANCELLED"
    | "EXPERIENCE_PUBLISHED"
    | "EXPERIENCE_UNPUBLISHED"
    | "EXPERIENCE_VERIFICATION_APPROVED"
    | "EXPERIENCE_VERIFICATION_REJECTED"
    | "GENERAL"
  channels?: Array<"TOAST" | "PUSH" | "EMAIL">
  href?: string | null
  metadata?: Record<string, unknown> | null
}

export type NotificationDTO = {
  id: string
  title: string
  message: string
  priority: "LOW" | "NORMAL" | "HIGH"
  eventType: string
  channels: string[]
  href?: string | null
  metadata?: unknown
  readAt?: string | null
  createdAt: string
}

// Singleton emitter across hot-reloads
const globalEmitter = globalThis as unknown as {
  __togetherNotifications?: EventEmitter
}

export const notificationsEmitter: EventEmitter =
  globalEmitter.__togetherNotifications ?? new EventEmitter()

// Increase listener limit for many concurrent users in dev
notificationsEmitter.setMaxListeners(1000)
globalEmitter.__togetherNotifications = notificationsEmitter

export async function ensureUserNotificationPreference(userId: string) {
  const existing = await prisma.notificationPreference.findUnique({ where: { userId } })
  if (!existing) {
    await prisma.notificationPreference.create({ data: { userId } })
  }
}

export async function listNotifications(userId: string, limit = 20) {
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: Math.max(1, Math.min(100, limit)),
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ])

  return {
    items: items.map(mapNotification),
    unreadCount,
  }
}

export async function markNotificationsRead(userId: string, ids: string[]) {
  if (!ids.length) return { updated: 0 }
  const result = await prisma.notification.updateMany({
    where: { id: { in: ids }, userId, readAt: null },
    data: { readAt: new Date() },
  })
  notificationsEmitter.emit(`read:${userId}`, { ids })
  return { updated: result.count }
}

export async function createNotification(payload: NotificationPayload) {
  const safePriority = payload.priority ?? "NORMAL"
  const safeEvent = payload.eventType ?? "GENERAL"
  const channels = payload.channels?.length ? payload.channels : ["TOAST"]

  await ensureUserNotificationPreference(payload.userId)
  const pref = await prisma.notificationPreference.findUnique({ where: { userId: payload.userId } })

  // Gate by user channel opt-ins and event toggles
  const allowToast = pref?.toastEnabled ?? true
  const allowEmail = pref?.emailEnabled ?? true
  const allowPush = pref?.pushEnabled ?? false

  const eventAllowed = isEventAllowed(pref, safeEvent)
  const effectiveChannels = channels.filter((channel) => {
    if (!eventAllowed) return false
    if (channel === "TOAST") return allowToast
    if (channel === "EMAIL") return allowEmail
    if (channel === "PUSH") return allowPush
    return false
  })

  const record = await prisma.notification.create({
    data: {
      userId: payload.userId,
      title: payload.title,
      message: payload.message,
      priority: safePriority as unknown as import("@/generated/prisma").$Enums.NotificationPriority,
      eventType: safeEvent as unknown as import("@/generated/prisma").$Enums.NotificationEventType,
      channels: effectiveChannels as unknown as import("@/generated/prisma").$Enums.NotificationChannel[],
      href: payload.href ?? null,
      metadata: (payload.metadata as unknown as import("@/generated/prisma").Prisma.InputJsonValue) ?? null,
    },
  })

  const dto = mapNotification(record)
  notificationsEmitter.emit(`notify:${payload.userId}`, dto)

  // Fire-and-forget email if enabled
  if (effectiveChannels.includes("EMAIL")) {
    void sendNotificationEmail(payload.userId, dto).catch(() => {})
  }

  return dto
}

function mapNotification(n: {
  id: string
  title: string
  message: string
  priority: "LOW" | "NORMAL" | "HIGH"
  eventType: string
  channels: string[]
  href?: string | null
  metadata?: unknown
  readAt?: Date | string | null
  createdAt: Date | string
}): NotificationDTO {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    priority: n.priority,
    eventType: n.eventType,
    channels: n.channels,
    href: sanitizeHref(n.href ?? null),
    metadata: n.metadata,
    readAt: n.readAt ? (n.readAt instanceof Date ? n.readAt.toISOString() : String(n.readAt)) : null,
    createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : String(n.createdAt),
  }
}

function isEventAllowed(
  pref: {
    toastEnabled?: boolean
    emailEnabled?: boolean
    pushEnabled?: boolean
    onBookingCreated?: boolean
    onBookingConfirmed?: boolean
    onBookingCancelled?: boolean
    onExperiencePublished?: boolean
    onExperienceUnpublished?: boolean
    onVerificationApproved?: boolean
    onVerificationRejected?: boolean
  } | null,
  event: string
) {
  if (!pref) return true
  switch (event) {
    case "BOOKING_CREATED":
      return !!pref.onBookingCreated
    case "BOOKING_CONFIRMED":
      return !!pref.onBookingConfirmed
    case "BOOKING_CANCELLED":
      return !!pref.onBookingCancelled
    case "EXPERIENCE_PUBLISHED":
      return !!pref.onExperiencePublished
    case "EXPERIENCE_UNPUBLISHED":
      return !!pref.onExperienceUnpublished
    case "EXPERIENCE_VERIFICATION_APPROVED":
      return !!pref.onVerificationApproved
    case "EXPERIENCE_VERIFICATION_REJECTED":
      return !!pref.onVerificationRejected
    default:
      return true
  }
}

async function sendNotificationEmail(userId: string, dto: NotificationDTO) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.email) return
  const subject = dto.title
  const link = dto.href ? `<p><a href="${dto.href}">Open</a></p>` : ""
  const html = `<div><h3>${escapeHtml(dto.title)}</h3><p>${escapeHtml(dto.message)}</p>${link}</div>`
  await sendEmail({ to: user.email, subject, html })
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function sseHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  }
}

export function writeSse(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`
}

function sanitizeHref(input: string | null): string | null {
  if (!input) return input
  return input.replace("/dashboard/organizer/organizer/", "/dashboard/organizer/")
}


