import { NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_: Request, { params }: { params: { key: string } }) {
  const session = await getServerAuthSession()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }
  const key = params.key.toLowerCase()
  const gateway = await prisma.paymentGateway.findUnique({ where: { key } })
  if (!gateway) return NextResponse.json({ message: "Not found" }, { status: 404 })
  return NextResponse.json({ gateway })
}

export async function PUT(request: Request, { params }: { params: { key: string } }) {
  const session = await getServerAuthSession()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }
  const key = params.key.toLowerCase()
  const body = (await request.json().catch(() => null)) as Partial<{
    name: string
    type: "CARD" | "CASH" | "PAYPAL"
    logoUrl?: string | null
    config?: unknown
    testMode?: boolean
    isEnabled?: boolean
  }> | null
  if (!body) return NextResponse.json({ message: "Invalid JSON" }, { status: 400 })
  const updated = await prisma.paymentGateway.update({
    where: { key },
    data: {
      ...(typeof body.name === "string" ? { name: body.name } : {}),
      ...(typeof body.type === "string" ? { type: body.type as "CARD" | "CASH" | "PAYPAL" } : {}),
      ...(typeof body.logoUrl === "string" || body.logoUrl === null ? { logoUrl: (body.logoUrl as string | null) ?? null } : {}),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      ...(body.config !== undefined ? { config: (body.config as any) } : {}),
      ...(typeof body.testMode === "boolean" ? { testMode: body.testMode } : {}),
      ...(typeof body.isEnabled === "boolean" ? { isEnabled: body.isEnabled } : {}),
    },
  })
  return NextResponse.json({ gateway: updated })
}


