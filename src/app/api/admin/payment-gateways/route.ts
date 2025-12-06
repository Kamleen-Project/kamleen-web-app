import { NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerAuthSession()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }
  const gateways = await prisma.paymentGateway.findMany({
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json({ gateways })
}

export async function POST(request: Request) {
  const session = await getServerAuthSession()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }
  const body = (await request.json().catch(() => null)) as Partial<{
    key: string
    name: string
    type: "CARD" | "CASH" | "PAYPAL"
    logoUrl?: string | null
    config?: unknown
    testMode?: boolean
    isEnabled?: boolean
  }> | null
  if (!body?.key || !body?.name || !body?.type) {
    return NextResponse.json({ message: "key, name and type are required" }, { status: 400 })
  }
  const created = await prisma.paymentGateway.create({
    data: {
      key: body.key.toLowerCase(),
      name: body.name,
      type: body.type,
      logoUrl: (typeof body.logoUrl === "string" ? body.logoUrl : null) ?? null,
       
       
      config: (body.config ?? null) as any,
      testMode: typeof body.testMode === "boolean" ? body.testMode : true,
      isEnabled: typeof body.isEnabled === "boolean" ? body.isEnabled : false,
    },
  })
  return NextResponse.json({ gateway: created }, { status: 201 })
}


