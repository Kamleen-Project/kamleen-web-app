import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await getServerAuthSession()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }
  const { searchParams } = new URL(request.url)
  const take = Math.min(Math.max(Number(searchParams.get("take") ?? 50), 1), 200)
  const cursor = searchParams.get("cursor")

  const payments = await prisma.payment.findMany({
    take: take + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      booking: {
        select: {
          id: true,
          status: true,
          totalPrice: true,
          experience: { select: { id: true, title: true } },
          explorer: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })
  const hasMore = payments.length > take
  const items = hasMore ? payments.slice(0, -1) : payments
  const nextCursor = hasMore ? items[items.length - 1]?.id : null
  return NextResponse.json({ payments: items, nextCursor })
}


