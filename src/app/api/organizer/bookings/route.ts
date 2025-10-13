import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { ExperienceBookingStatus, Prisma } from "@/generated/prisma"

const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 50

export async function GET(request: Request) {
  try {
    const session = await getServerAuthSession()

    if (!session?.user) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 })
    }

    if (session.user.activeRole !== "ORGANIZER") {
      return NextResponse.json({ message: "Only organizers can view bookings." }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1)
    const pageSizeRaw = Number.parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number.isNaN(pageSizeRaw) ? DEFAULT_PAGE_SIZE : pageSizeRaw),
    )
    const statusParam = searchParams.get("status")
    const statusFilter: ExperienceBookingStatus | null =
      statusParam === "PENDING" || statusParam === "CONFIRMED" || statusParam === "CANCELLED"
        ? (statusParam as ExperienceBookingStatus)
        : null

    const baseWhere: Prisma.ExperienceBookingWhereInput = {
      experience: {
        organizerId: session.user.id,
      },
    }

    const where: Prisma.ExperienceBookingWhereInput = statusFilter
      ? {
          ...baseWhere,
          status: statusFilter,
        }
      : baseWhere

    const [total, bookings] = await Promise.all([
      prisma.experienceBooking.count({ where }),
      prisma.experienceBooking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          experience: { select: { id: true, title: true, slug: true } },
          session: { select: { id: true, startAt: true } },
          explorer: { select: { name: true, email: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return NextResponse.json({ bookings, total, page, pageSize })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load bookings. Please try again later."
    return NextResponse.json({ message }, { status: 500 })
  }
}
