import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { renderTemplate, sendEmail } from "@/lib/email"

const ALLOWED_STATUSES = ["CONFIRMED", "CANCELLED"] as const

type UpdatePayload = {
  bookingId?: unknown
  status?: unknown
}

export async function POST(request: Request) {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 })
  }

  if (session.user.activeRole !== "ORGANIZER") {
    return NextResponse.json({ message: "Only organizers can update bookings." }, { status: 403 })
  }

  const payload = (await request.json().catch(() => null)) as UpdatePayload | null
  if (!payload) {
    return NextResponse.json({ message: "Invalid JSON." }, { status: 400 })
  }

  const bookingId = typeof payload.bookingId === "string" ? payload.bookingId : null
  const nextStatus = ALLOWED_STATUSES.includes(payload.status as (typeof ALLOWED_STATUSES)[number])
    ? (payload.status as (typeof ALLOWED_STATUSES)[number])
    : null

  if (!bookingId) {
    return NextResponse.json({ message: "bookingId is required." }, { status: 400 })
  }

  if (!nextStatus) {
    return NextResponse.json({ message: "Invalid status value." }, { status: 400 })
  }

  const booking = await prisma.experienceBooking.findFirst({
    where: {
      id: bookingId,
      experience: {
        organizerId: session.user.id,
      },
    },
    include: {
      experience: { select: { id: true, title: true, slug: true, currency: true } },
      session: { select: { startAt: true } },
      explorer: { select: { id: true, name: true, email: true } },
    },
  })

  if (!booking) {
    return NextResponse.json({ message: "Booking not found." }, { status: 404 })
  }

  if (booking.status === "CANCELLED" && nextStatus === "CONFIRMED") {
    return NextResponse.json({ message: "Cancelled bookings cannot be reconfirmed." }, { status: 409 })
  }

  if (booking.status === nextStatus) {
    return NextResponse.json({ booking })
  }

  const updated = await prisma.experienceBooking.update({
    where: { id: booking.id },
    data: { status: nextStatus },
    include: {
      experience: { select: { id: true, title: true, slug: true, currency: true } },
      session: { select: { startAt: true } },
      explorer: { select: { id: true, name: true, email: true } },
    },
  })

  // Notify explorer on state changes
  try {
    if (nextStatus === "CONFIRMED") {
      await createNotification({
        userId: updated.explorer.id,
        title: "Reservation confirmed",
        message: `Your reservation for ${updated.experience.title} has been confirmed`,
        eventType: "BOOKING_CONFIRMED",
        priority: "NORMAL",
        channels: ["TOAST", "EMAIL"],
        href: "/dashboard/explorer/reservations",
        metadata: { bookingId: updated.id, experienceId: updated.experience.id },
      })
    } else if (nextStatus === "CANCELLED") {
      await createNotification({
        userId: updated.explorer.id,
        title: "Reservation cancelled",
        message: `Your reservation for ${updated.experience.title} was cancelled`,
        eventType: "BOOKING_CANCELLED",
        priority: "NORMAL",
        channels: ["TOAST"], // use template email separately
        href: "/dashboard/explorer/reservations",
        metadata: { bookingId: updated.id, experienceId: updated.experience.id },
      })

      // Fire-and-forget template email to explorer if they have an email
      const userEmail = updated.explorer.email
      if (userEmail) {
        const origin = (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.length > 0)
          ? process.env.NEXT_PUBLIC_APP_URL
          : new URL(request.url).origin
        const sessionDate = new Date(updated.session.startAt).toLocaleString()
        const tpl = await renderTemplate("booking_cancelled_explorer", {
          name: updated.explorer.name || "",
          experienceTitle: updated.experience.title,
          sessionDate,
          dashboardUrl: `${origin}/dashboard/explorer/reservations`,
        })
        if (tpl) {
          void sendEmail({ to: userEmail, subject: tpl.subject, html: tpl.html, text: tpl.text }).catch(() => {})
        }
      }
    }
  } catch {}

  return NextResponse.json({ booking: updated })
}
