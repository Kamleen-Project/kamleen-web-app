import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Public endpoint exposing only non-sensitive payment settings for client-side UI
export async function GET() {
  try {
    const gateways = await prisma.paymentGateway.findMany({
      select: { key: true, name: true, type: true, logoUrl: true, testMode: true, isEnabled: true },
      orderBy: { createdAt: "asc" },
    })
    const enabled = gateways.filter((g) => g.isEnabled).map((g) => g.key.toUpperCase())
    return NextResponse.json({
      providers: gateways,
      enabledProviders: enabled,
      defaultProvider: enabled[0] || null,
      testMode: gateways.some((g) => g.testMode),
      paymentBrandImageUrl: null,
    })
  } catch {
    return NextResponse.json({
      providers: [],
      enabledProviders: [],
      defaultProvider: null,
      testMode: true,
      paymentBrandImageUrl: null,
    })
  }
}


