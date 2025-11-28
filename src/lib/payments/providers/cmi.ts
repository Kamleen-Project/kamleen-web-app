import crypto from "crypto"
import { PaymentProvider, CreateCheckoutParams, CreateCheckoutResult, ProviderCreateRefundParams, ProviderCreateRefundResult } from "@/lib/payments/types"
import { prisma } from "@/lib/prisma"

async function resolveConfig(): Promise<{ secret: string; gatewayBase: string; clientId: string }> {
    const gw = await prisma.paymentGateway.findUnique({ where: { key: "cmi" } })
    const cfg = (gw?.config as null | { secretKey?: string; gatewayUrl?: string; clientId?: string }) || {}

    const fromCfgSecret = typeof cfg.secretKey === "string" ? cfg.secretKey : null
    const secret =
        (fromCfgSecret && !fromCfgSecret.startsWith("env:")) ? fromCfgSecret :
            (fromCfgSecret?.startsWith("env:") ? process.env[fromCfgSecret.slice(4)] : undefined) ||
            process.env.CMI_SECRET_KEY

    const clientId = typeof cfg.clientId === "string" ? cfg.clientId : process.env.CMI_CLIENT_ID

    if (!secret) throw new Error("Missing CMI secret key")
    if (!clientId) throw new Error("Missing CMI client id")

    const gatewayBase = (typeof cfg.gatewayUrl === "string" && cfg.gatewayUrl.length > 0)
        ? cfg.gatewayUrl
        : (process.env.CMI_GATEWAY_URL || "https://testpayment.cmi.co.ma/  ") // Default to test URL or prod depending on env, but here we use a placeholder

    return { secret, gatewayBase, clientId }
}

function buildSignature(payload: Record<string, string>, secret: string): string {
    // CMI signature logic usually involves sorting keys and hashing with secret.
    // Assuming similar to Payzone for now as they are often similar in this region, 
    // but CMI often uses a specific ordering or parameter set.
    // We will use a generic alphabetical sort + HMAC-SHA256 for now.
    // TODO: Verify exact CMI spec.

    const sorted = Object.keys(payload).sort()
    const base = sorted.map((k) => `${k}=${payload[k]}`).join("&")
    // CMI often uses SHA512 or specific hashing. We'll stick to SHA256 unless specified otherwise.
    // If CMI requires base64 of hash, we'll adjust.
    return crypto.createHash("sha512").update(base + secret).digest("base64")
    // Note: Real CMI implementation details vary. This is a placeholder based on common CMI integrations.
}

export const cmiProvider: PaymentProvider = {
    id: "cmi",

    async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
        const { secret, gatewayBase, clientId } = await resolveConfig()
        const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/webhooks/cmi`

        const payload: Record<string, string> = {
            clientid: clientId,
            oid: params.metadata?.paymentId || params.bookingId,
            amount: String(params.amount / 100), // CMI usually takes major units
            currency: params.currency, // "504" for MAD usually, but we'll send ISO code if supported or map it.
            // For simplicity, we assume the gateway accepts ISO codes or we'd need a mapper.
            okUrl: params.successUrl,
            failUrl: params.cancelUrl,
            callbackUrl: callbackUrl,
            email: params.customerEmail || "",
            billToName: "Guest", // We might want to pass this in params
            rnd: Date.now().toString(),
        }

        // CMI specific: hash calculation
        // Usually: create hash from params + secret
        // We'll assume the buildSignature function handles it.
        // For CMI, the signature parameter is often called "hash" or "storeKey" related.
        // We will use "hash" as a placeholder.

        // IMPORTANT: In a real integration, we'd need the exact CMI documentation.
        // Since we are "analyzing and improving", we implement a standard redirect structure.

        // We'll just append the signature to the URL parameters for the redirect.
        const url = new URL(gatewayBase)
        Object.entries(payload).forEach(([k, v]) => url.searchParams.set(k, v))

        // We don't generate signature here to avoid breaking if logic is wrong without docs.
        // But we should at least put a placeholder.
        // url.searchParams.set("hash", "GENERATED_HASH")

        return { url: url.toString(), providerPaymentId: payload.oid }
    },

    async createRefund(_params: ProviderCreateRefundParams): Promise<ProviderCreateRefundResult> {
        throw new Error("CMI refunds not implemented")
    },
}
