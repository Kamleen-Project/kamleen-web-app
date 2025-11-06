import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const cronKey = request.headers.get("x-cron-key")
  if (!cronKey || cronKey !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }
  const now = new Date()
  const expired = await prisma.experienceBooking.findMany({
    where: {
      expiresAt: { lte: now },
      status: { in: ["PENDING"] },
      NOT: { paymentStatus: { equals: "SUCCEEDED" } },
    },
    select: { id: true },
  })
  if (expired.length === 0) return NextResponse.json({ expired: 0 })
  await prisma.experienceBooking.updateMany({
    where: { id: { in: expired.map((b) => b.id) } },
    data: { status: "CANCELLED" },
  })
  return NextResponse.json({ expired: expired.length })
}


