import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { renderTemplate, sendEmail } from "@/lib/email"
import { buildTicketsPdfForBooking, createTicketsForBooking } from "@/lib/tickets"

/**
 * Runs unified side-effects for a confirmed booking:
 * - Ensures tickets exist, builds PDF, emails to explorer
 * - Sends in-app/email notification to explorer
 */
export async function runBookingConfirmationSideEffects(params: { bookingId: string; origin?: string }) {
  const booking = await prisma.experienceBooking.findUnique({
    where: { id: params.bookingId },
    include: {
      explorer: { select: { id: true, name: true, email: true } },
      experience: { select: { id: true, title: true } },
      session: { select: { startAt: true } },
    },
  })
  if (!booking) return

  // Notify explorer
  try {
    await createNotification({
      userId: booking.explorer.id,
      title: "Reservation confirmed",
      message: `Your reservation for ${booking.experience.title} has been confirmed`,
      eventType: "BOOKING_CONFIRMED",
      priority: "NORMAL",
      channels: ["TOAST", "EMAIL"],
      href: "/dashboard/explorer/reservations",
      metadata: { bookingId: booking.id, experienceId: booking.experience.id },
    })
  } catch {}

  // Tickets and delivery email
  try {
    await createTicketsForBooking(booking.id)
    const pdf = await buildTicketsPdfForBooking(booking.id)
    const userEmail = booking.explorer.email
    if (userEmail) {
      const origin = (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.length > 0)
        ? process.env.NEXT_PUBLIC_APP_URL
        : (params.origin || "")
      const sessionDate = new Date(booking.session.startAt).toLocaleString()
      const tpl = await renderTemplate("tickets_delivery", {
        name: booking.explorer.name || "",
        experienceTitle: booking.experience.title,
        sessionDate,
        dashboardUrl: origin ? `${origin.replace(/\/$/, "")}/dashboard/explorer/reservations` : "/dashboard/explorer/reservations",
      })
      if (tpl) {
        void sendEmail({
          to: userEmail,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
          attachments: [
            { filename: `tickets-${booking.id}.pdf`, content: pdf, contentType: "application/pdf" },
          ],
        }).catch(() => {})
      }
    }
  } catch (e) {
    console.error("[booking-confirmation] tickets/email failed", e)
  }
}


