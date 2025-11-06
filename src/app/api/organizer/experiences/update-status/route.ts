import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Payload = {
  experienceId?: unknown
  nextStatus?: unknown
}

const STATUS_VALUES = ["DRAFT", "PUBLISHED", "UNPUBLISHED", "UNLISTED", "ARCHIVED"] as const
type Status = (typeof STATUS_VALUES)[number]

export async function POST(request: Request) {
  const session = await getServerAuthSession()
  if (!session?.user) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 })
  }
  if (session.user.activeRole !== "ORGANIZER") {
    return NextResponse.json({ message: "Only organizers can update experience status." }, { status: 403 })
  }

  const payload = (await request.json().catch(() => null)) as Payload | null
  if (!payload) {
    return NextResponse.json({ message: "Invalid JSON payload." }, { status: 400 })
  }

  const experienceId = typeof payload.experienceId === "string" ? payload.experienceId : null
  const nextStatus = STATUS_VALUES.includes(payload.nextStatus as Status) ? (payload.nextStatus as Status) : null

  if (!experienceId) {
    return NextResponse.json({ message: "experienceId is required." }, { status: 400 })
  }
  if (!nextStatus) {
    return NextResponse.json({ message: "Invalid status value." }, { status: 400 })
  }

  const experience = await prisma.experience.findFirst({
    where: { id: experienceId, organizerId: session.user.id },
    select: {
      id: true,
      status: true,
      verificationStatus: true,
      sessions: {
        select: {
          id: true,
          startAt: true,
          bookings: { where: { status: { in: ["PENDING", "CONFIRMED"] } }, select: { id: true }, take: 1 },
        },
      },
    },
  })

  if (!experience) {
    return NextResponse.json({ message: "Experience not found." }, { status: 404 })
  }

  // Block any status changes while pending verification
  if (experience.verificationStatus === "PENDING") {
    return NextResponse.json({ message: "Experience is pending verification; status cannot be changed." }, { status: 409 })
  }

  // Enforce business rules
  // 1) Publishing requires VERIFIED
  if (nextStatus === "PUBLISHED" && experience.verificationStatus !== "VERIFIED") {
    return NextResponse.json({ message: "Experience must be verified by admin before publishing." }, { status: 409 })
  }

  // 2) We can't unpublish a DRAFT (only makes sense from PUBLISHED)
  if (nextStatus === "UNPUBLISHED" && experience.status === "DRAFT") {
    return NextResponse.json({ message: "Cannot unpublish a draft experience." }, { status: 409 })
  }

  // 3) Unpublish only if no reservations in any sessions
  if (nextStatus === "UNPUBLISHED") {
    const now = new Date()
    const hasActiveFuture = experience.sessions.some((s) => new Date((s as { startAt?: Date }).startAt as Date) >= now && (s.bookings ?? []).length > 0)
    if (hasActiveFuture) {
      return NextResponse.json({ message: "Cannot unpublish: there are active reservations in sessions. Use Unlisted instead." }, { status: 409 })
    }
  }

  // 4) We can't unlist a DRAFT or an UNPUBLISHED experience
  if (nextStatus === "UNLISTED") {
    if (experience.status === "DRAFT") {
      return NextResponse.json({ message: "Cannot unlist a draft experience." }, { status: 409 })
    }
    if (experience.status === "UNPUBLISHED") {
      return NextResponse.json({ message: "Cannot unlist an unpublished experience." }, { status: 409 })
    }
    // Require active bookings in a future session to unlist (otherwise unpublish should be used)
    const now = new Date()
    const hasActiveFuture = experience.sessions.some((s) => new Date((s as { startAt?: Date }).startAt as Date) >= now && (s.bookings ?? []).length > 0)
    if (!hasActiveFuture) {
      return NextResponse.json({ message: "Cannot unlist: there are no active reservations. Use Unpublish instead." }, { status: 409 })
    }
  }

  // 5) Archive only allowed when not PUBLISHED and not UNLISTED
  if (nextStatus === "ARCHIVED") {
    if (experience.status === "PUBLISHED" || experience.status === "UNLISTED") {
      return NextResponse.json({ message: "Only draft or unpublished experiences can be archived." }, { status: 409 })
    }
  }

  // 6) Draft transitions: allowed only from UNPUBLISHED or ARCHIVED
  if (nextStatus === "DRAFT") {
    const allowedFrom = ["UNPUBLISHED", "ARCHIVED"] as const
    if (!allowedFrom.includes(experience.status as typeof allowedFrom[number])) {
      return NextResponse.json({ message: "Draft is only allowed from unpublished or archived experiences." }, { status: 409 })
    }
  }

  const updated = await prisma.experience.update({
    where: { id: experience.id },
    data: { status: nextStatus },
    select: { id: true, status: true, verificationStatus: true },
  })

  return NextResponse.json({ ok: true, experience: updated })
}


