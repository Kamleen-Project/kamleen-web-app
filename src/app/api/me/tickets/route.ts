import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getServerAuthSession } from "@/lib/auth"

export async function GET() {
  const session = await getServerAuthSession()
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  if (session.user.activeRole !== "EXPLORER") return NextResponse.json({ message: "Forbidden" }, { status: 403 })

  const tickets = await prisma.ticket.findMany({
    where: { explorerId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      seatNumber: true,
      status: true,
      createdAt: true,
      booking: {
        select: {
          id: true,
          status: true,
          session: { select: { startAt: true } },
          experience: { select: { id: true, title: true, slug: true } },
        },
      },
    },
  })

  return NextResponse.json({ tickets })
}


