import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { createNotification, listNotifications, markNotificationsRead } from "@/lib/notifications"

type AdminCreatePayload = {
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
  href?: string
  metadata?: Record<string, unknown>
}

type MarkReadPayload = { ids?: unknown }

export async function GET(request: Request) {
  const session = await getServerAuthSession()
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const limit = Number.parseInt(searchParams.get("limit") || "20", 10)
  const data = await listNotifications(session.user.id, limit)
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const session = await getServerAuthSession()
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }
  let payloadUnknown: unknown
  try {
    payloadUnknown = await request.json()
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 })
  }
  const payload = payloadUnknown as Partial<AdminCreatePayload>
  if (!payload || typeof payload.userId !== "string") {
    return NextResponse.json({ message: "Missing userId" }, { status: 400 })
  }
  if (!payload.title || !payload.message) {
    return NextResponse.json({ message: "Missing title or message" }, { status: 400 })
  }
  const dto = await createNotification({
    userId: payload.userId,
    title: String(payload.title),
    message: String(payload.message),
    priority: payload.priority,
    eventType: payload.eventType,
    channels: payload.channels,
    href: payload.href,
    metadata: payload.metadata,
  })
  return NextResponse.json({ notification: dto }, { status: 201 })
}

export async function PATCH(request: Request) {
  const session = await getServerAuthSession()
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  let payloadUnknown: unknown
  try {
    payloadUnknown = await request.json()
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 })
  }
  const payload = payloadUnknown as MarkReadPayload
  const ids = Array.isArray(payload?.ids) ? (payload.ids as unknown[]).filter((v) => typeof v === "string") as string[] : []
  const { updated } = await markNotificationsRead(session.user.id, ids)
  return NextResponse.json({ updated })
}


