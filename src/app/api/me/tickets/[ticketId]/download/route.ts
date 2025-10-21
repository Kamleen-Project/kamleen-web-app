import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getServerAuthSession } from "@/lib/auth"
import { renderTicketsPdf } from "@/lib/tickets"

export async function GET(_: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const session = await getServerAuthSession()
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  const { ticketId } = await params

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, explorerId: session.user.id },
    include: {
      booking: { include: { explorer: true, session: true, experience: true } },
      session: true,
      experience: { select: { title: true, slug: true, meetingAddress: true, location: true, currency: true, price: true, heroImage: true, duration: true, organizer: { select: { name: true } } } },
    },
  })
  if (!ticket) return NextResponse.json({ message: "Not found" }, { status: 404 })

  const pdf = await renderTicketsPdf(
    [{ code: ticket.code, seatNumber: ticket.seatNumber }],
    {
      experience: {
        title: ticket.experience.title,
        slug: (ticket.experience as { slug?: string | null }).slug ?? null,
        meetingAddress: ticket.experience.meetingAddress,
        location: ticket.experience.location,
        currency: ticket.experience.currency,
        price: (ticket.experience as { price?: number | null }).price ?? null,
        heroImage: (ticket.experience as { heroImage?: string | null }).heroImage ?? null,
        organizerName: (ticket.experience as { organizer?: { name?: string | null } | null }).organizer?.name ?? null,
        duration: (ticket.experience as { duration?: string | null }).duration ?? null,
      },
      session: {
        startAt: (ticket.session as { startAt: Date }).startAt,
        locationLabel: (ticket.session as { locationLabel?: string | null }).locationLabel ?? null,
        duration: (ticket.session as { duration?: string | null } | null)?.duration ?? null,
        priceOverride: (ticket.session as { priceOverride?: number | null } | null)?.priceOverride ?? null,
      },
      explorer: { name: ticket.booking.explorer.name, email: ticket.booking.explorer.email },
      reservationDate: (ticket.booking as { createdAt?: Date | string } | null)?.createdAt ? new Date((ticket.booking as { createdAt?: Date | string }).createdAt as Date) : new Date(),
    },
  )

  const uint8 = Uint8Array.from(pdf)
  const blob = new Blob([uint8], { type: "application/pdf" })
  return new NextResponse(blob, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=ticket-${ticket.code}.pdf`,
    },
  })
}


