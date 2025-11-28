import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const gateway = await prisma.paymentGateway.findUnique({ where: { key: "paypal" } })
    const cfg = (gateway?.config as null | { clientId?: string }) || {}
    const clientId =
      (typeof cfg.clientId === "string" && cfg.clientId.length > 0)
        ? cfg.clientId
        : (process.env.PAYPAL_CLIENT_ID || null)

    if (!clientId) {
      return NextResponse.json({ message: "PayPal not configured" }, { status: 404 })
    }
    // Expose only the client-id; not a secret per PayPal docs
    return NextResponse.json({ clientId })
  } catch {
    return NextResponse.json({ message: "Failed to resolve PayPal settings" }, { status: 500 })
  }
}


