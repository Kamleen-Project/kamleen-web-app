import { PaymentProvider, CreateCheckoutParams, CreateCheckoutResult, ProviderCreateRefundParams, ProviderCreateRefundResult } from "@/lib/payments/types"
import { prisma } from "@/lib/prisma"

export const cashProvider: PaymentProvider = {
    id: "cash",

    async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
        // Cash flow:
        // 1. We don't redirect to an external gateway.
        // 2. We return the successUrl immediately.
        // 3. The calling code (in index.ts) handles the database creation for Payment/Booking updates
        //    BUT to be a proper provider, we should probably return the "url" as the successUrl.
        //    However, the index.ts logic currently does specific DB updates for Cash *before* returning.
        //    We will refactor index.ts to delegate this, or keep it simple.

        // In the new architecture, index.ts will call createCheckout.
        // For Cash, we want to ensure the Payment is marked as PROCESSING (not REQUIRES_PAYMENT_METHOD).
        // But `index.ts` creates the initial payment record.

        // To keep it clean:
        // We'll return the successUrl.
        // The `index.ts` will handle the "providerPaymentId" which for cash might just be "CASH-<timestamp>" or similar if needed, 
        // but usually it's null or internal.

        return {
            url: params.successUrl,
            providerPaymentId: `CASH-${Date.now()}`,
        }
    },

    async createRefund(_params: ProviderCreateRefundParams): Promise<ProviderCreateRefundResult> {
        throw new Error("Cash refunds must be handled manually.")
    },
}
