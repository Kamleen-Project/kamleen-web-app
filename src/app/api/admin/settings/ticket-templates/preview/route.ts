import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { renderTicketsPdfFromTemplateHtml } from "@/lib/tickets"

export async function POST(request: Request) {
  const session = await getServerAuthSession()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => null) as { html?: string } | null
  if (!body?.html) {
    return NextResponse.json({ message: "html is required" }, { status: 400 })
  }

  const entries = [{ code: "T-TEST-ABC123", seatNumber: 1 }]
  const ctx = {
    experience: {
      title: "Sample Experience Title",
      slug: "sample-experience-title",
      meetingAddress: "123 Main Street",
      location: "",
      currency: "USD",
      price: 49,
      duration: "2h 00m",
      heroImage: "/images/placeholder-experience.svg",
      organizerName: "Jane Organizer",
    },
    session: { startAt: new Date(), duration: "2h 00m", priceOverride: null, meetingAddress: "123 Main Street", locationLabel: "City Center" },
    explorer: { name: "John Doe", email: "john@example.com" },
    reservationDate: new Date(),
  }

  const pdf = await renderTicketsPdfFromTemplateHtml(body.html, entries, ctx)
  // Create a fresh Uint8Array copy so the underlying buffer is a standard ArrayBuffer
  const uint8 = new Uint8Array(pdf)
  return new NextResponse(uint8, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="ticket-preview.pdf"`,
    },
  })
}


