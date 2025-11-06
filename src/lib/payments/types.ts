export type PaymentProviderId = "stripe" | "cmi" | "payzone" | "cash" | "paypal"

export type CreateCheckoutParams = {
  bookingId: string
  amount: number // minor units
  currency: string
  successUrl: string
  cancelUrl: string
  description: string
  customerEmail?: string | null
  metadata?: Record<string, string>
}

export type CreateCheckoutResult = {
  url: string
  providerPaymentId?: string | null
}

export type ProviderCreateRefundParams = {
  paymentProviderId: string
  amount: number
  reason?: string
}

export type ProviderCreateRefundResult = {
  providerRefundId?: string | null
}

export interface PaymentProvider {
  id: PaymentProviderId
  createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult>
  createRefund(params: ProviderCreateRefundParams): Promise<ProviderCreateRefundResult>
}


