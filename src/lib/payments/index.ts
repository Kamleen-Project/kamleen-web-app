import { prisma } from "@/lib/prisma"
// Prisma enum type varies by version; we avoid importing the enum type directly to keep compatibility.
import { stripeProvider, verifyStripeWebhookSignature } from "@/lib/payments/providers/stripe"
import { payzoneProvider } from "@/lib/payments/providers/payzone"
import { paypalProvider } from "@/lib/payments/providers/paypal"
import { PaymentProvider, PaymentProviderId, CreateCheckoutParams, CreateCheckoutResult, ProviderCreateRefundParams, ProviderCreateRefundResult } from "@/lib/payments/types"

function providerFor(id: PaymentProviderId): PaymentProvider {
  switch (id) {
    case "stripe":
      return stripeProvider
    case "payzone":
      return payzoneProvider
    case "paypal":
      return paypalProvider
    default:
      throw new Error(`Unsupported provider: ${id}`)
  }
}

export async function getPaymentSettings() {
  const existing = await prisma.paymentSettings.findFirst()
  if (existing) return existing
  return await prisma.paymentSettings.create({
    data: {
      defaultProvider: "STRIPE",
      enabledProviders: ["STRIPE"],
      testMode: true,
    },
  })
}

export async function createCheckoutForBooking(params: {
  bookingId: string
  successUrl: string
  cancelUrl: string
  providerId?: PaymentProviderId
}) {
  const booking = await prisma.experienceBooking.findUnique({
    where: { id: params.bookingId },
    include: { experience: true, explorer: true, session: true },
  })
  if (!booking) throw new Error("Booking not found")
  const settings = await getPaymentSettings()
  const implemented = new Set<PaymentProviderId>(["stripe", "payzone", "paypal", "cash"]) // currently supported
  const requested = params.providerId
  const defaultCandidate = settings.defaultProvider.toLowerCase() as PaymentProviderId
  const enabledCandidates = (settings.enabledProviders || []).map((p) => p.toLowerCase() as PaymentProviderId)
  const candidates = [requested ?? defaultCandidate, ...enabledCandidates].filter((id, idx, arr) => arr.indexOf(id) === idx)
  const chosen = candidates.find((id) => implemented.has(id))
  if (!chosen) {
    throw new Error("No supported payment provider is enabled. Enable Stripe or Payzone in settings.")
  }
  // Cash flow: confirm immediately, create Payment with status PROCESSING, no redirect to external gateway
  if (chosen === "cash") {
    const payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        // cast to avoid dependency on generated enums before migration/generate runs
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        provider: "CASH" as any,
        amount: Math.round(booking.totalPrice * 100),
        currency: booking.experience.currency,
        status: "PROCESSING",
        metadata: { bookingId: booking.id },
      },
    })

    await prisma.experienceBooking.update({
      where: { id: booking.id },
      data: { status: "CONFIRMED", paymentId: payment.id, paymentStatus: "PROCESSING", expiresAt: null },
    })

    // For now, we redirect back to successUrl; optional: trigger tickets and notifications elsewhere
    return { url: params.successUrl, paymentId: payment.id }
  }

  const payment = await prisma.payment.create({
    data: {
      bookingId: booking.id,
      // Seed with configured default (typed from Prisma) to satisfy type constraints;
      // we correct it below if we fall back to another provider.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      provider: (chosen.toUpperCase()) as any,
      amount: Math.round(booking.totalPrice * 100),
      currency: booking.experience.currency,
      status: "REQUIRES_PAYMENT_METHOD",
      metadata: { bookingId: booking.id },
    },
  })

  let result: CreateCheckoutResult | null = null
  let lastError: unknown = null
  // Try chosen, then any other implemented+enabled providers as fallback, in order
  const tryOrder = [chosen, ...enabledCandidates.filter((id) => id !== chosen && implemented.has(id))]
  for (const id of tryOrder) {
    try {
      const prov = providerFor(id)
      result = await prov.createCheckout({
        bookingId: booking.id,
        amount: Math.round(booking.totalPrice * 100),
        currency: booking.experience.currency,
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
        description: `${booking.experience.title}${booking.session ? ` • ${new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(booking.session.startAt)}` : ""}`,
        customerEmail: booking.explorer.email ?? undefined,
        metadata: { bookingId: booking.id, paymentId: payment.id },
      } as CreateCheckoutParams)
      // Update provider in case of fallback
      if (id !== chosen) {
        // Narrowing Prisma enum type for update without tying to client internals
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await prisma.payment.update({ where: { id: payment.id }, data: { provider: id.toUpperCase() as any } })
      }
      break
    } catch (e) {
      lastError = e
      // continue to next
    }
  }
  if (!result) {
    const message = (() => {
      if (lastError && typeof lastError === "object" && "message" in (lastError as { message?: unknown })) {
        const m = (lastError as { message?: unknown }).message
        if (typeof m === "string") return m
      }
      return "Failed to create checkout session."
    })()
    throw new Error(message)
  }

  // Persist provider payment id if present
  if (result.providerPaymentId) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerPaymentId: result.providerPaymentId },
    })
  }

  // Link latest payment to booking and mark awaiting action
  await prisma.experienceBooking.update({
    where: { id: booking.id },
    data: { paymentId: payment.id, paymentStatus: "REQUIRES_PAYMENT_METHOD" },
  })

  return { url: result.url, paymentId: payment.id }
}

type StripeEvent = { type: string; data: { object: Record<string, unknown> } }

export async function handleStripeWebhook({ payload, header }: { payload: string; header: string | null }) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error("Missing STRIPE_WEBHOOK_SECRET")
  const valid = verifyStripeWebhookSignature({ payload, header, secret })
  if (!valid) throw new Error("Invalid Stripe signature")

  const event = JSON.parse(payload) as StripeEvent
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as { metadata?: Record<string, string>; payment_intent?: string; id: string }
      const bookingId = (session.metadata?.bookingId as string | undefined) ?? null
      const paymentId = (session.metadata?.paymentId as string | undefined) ?? null
      // Prefer payment_intent to later refund, etc.
      const providerPaymentId = (session.payment_intent as string | undefined) ?? session.id
      if (!bookingId || !paymentId) return { ok: true }
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: "PROCESSING", providerPaymentId },
      })
      return { ok: true }
    }
    case "payment_intent.succeeded": {
      const pi = event.data.object as { id: string; metadata?: Record<string, string>; charges?: { data?: Array<{ receipt_url?: string }> }; last_payment_error?: { code?: string; message?: string } }
      const metadata = pi.metadata || {}
      const bookingId = (metadata.bookingId as string | undefined) ?? null
      const paymentId = (metadata.paymentId as string | undefined) ?? null
      const providerPaymentId = pi.id
      if (!bookingId || !paymentId) return { ok: true }

      const booking = await prisma.experienceBooking.update({
        where: { id: bookingId },
        data: {
          status: "CONFIRMED",
          paymentStatus: "SUCCEEDED",
          expiresAt: null,
        },
        include: { explorer: true, experience: true, session: true },
      })

      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: "SUCCEEDED",
          providerPaymentId,
          receiptUrl: pi.charges?.data?.[0]?.receipt_url ?? null,
          capturedAt: new Date(),
        },
      })

      // Side-effects handled outside to keep module pure
      return { ok: true, bookingId: booking.id }
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object as { metadata?: Record<string, string>; last_payment_error?: { code?: string; message?: string } }
      const metadata = pi.metadata || {}
      const bookingId = (metadata.bookingId as string | undefined) ?? null
      const paymentId = (metadata.paymentId as string | undefined) ?? null
      if (bookingId && paymentId) {
        await prisma.payment.update({ where: { id: paymentId }, data: { status: "CANCELLED", errorCode: pi.last_payment_error?.code ?? null, errorMessage: pi.last_payment_error?.message ?? null } })
        await prisma.experienceBooking.update({ where: { id: bookingId }, data: { paymentStatus: "CANCELLED" } })
      }
      return { ok: true }
    }
    default:
      return { ok: true }
  }
}

export async function createRefundForPayment(paymentId: string, amount: number, reason?: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment) throw new Error("Payment not found")
  const providerId: PaymentProviderId = (payment.provider.toLowerCase() as PaymentProviderId)
  const provider = providerFor(providerId)
  if (!payment.providerPaymentId) throw new Error("Missing provider payment id")

  const res: ProviderCreateRefundResult = await provider.createRefund({ paymentProviderId: payment.providerPaymentId, amount, reason } as ProviderCreateRefundParams)
  await prisma.refund.create({
    data: {
      paymentId: payment.id,
      amount,
      reason: reason ?? null,
      status: "PENDING",
      providerRefundId: res.providerRefundId ?? null,
    },
  })
  return { ok: true, providerRefundId: res.providerRefundId }
}


