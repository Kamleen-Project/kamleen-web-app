import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const ACTIVE_STATUSES = ["PENDING", "CONFIRMED"] as const

type StatusFilter = "ALL" | "PENDING" | "CONFIRMED" | "CANCELLED"

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
    const statusParam = (searchParams.get("status") || "ALL") as StatusFilter
    const now = new Date()

    const experiences = await prisma.experience.findMany({
      where: {
        organizerId: session.user.id,
        status: "PUBLISHED",
        sessions: {
          some: { startAt: { gte: now } },
        },
      },
      select: {
        id: true,
        title: true,
        duration: true,
        slug: true,
        currency: true,
        meetingCity: true,
        location: true,
        meetingAddress: true,
        sessions: {
          where: { startAt: { gte: now } },
          orderBy: { startAt: "asc" },
          select: {
            id: true,
            startAt: true,
            duration: true,
            capacity: true,
            locationLabel: true,
            meetingAddress: true,
            bookings: {
              where:
                statusParam === "ALL"
                  ? undefined
                  : {
                      status: statusParam,
                    },
              select: {
                id: true,
                status: true,
                guests: true,
                totalPrice: true,
                createdAt: true,
                explorer: { select: { name: true, email: true } },
              },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
      orderBy: { title: "asc" },
    })

    const allSessionIds = experiences.flatMap((exp) => exp.sessions.map((s) => s.id))

    let reservedBySession: Record<string, number> = {}
    let pendingBySession: Record<string, number> = {}
    if (allSessionIds.length) {
      const groups = await prisma.experienceBooking.groupBy({
        by: ["sessionId"],
        where: {
          sessionId: { in: allSessionIds },
          status: { in: [...ACTIVE_STATUSES] },
        },
        _sum: { guests: true },
      })
      reservedBySession = groups.reduce<Record<string, number>>((acc, g) => {
        acc[g.sessionId] = g._sum.guests || 0
        return acc
      }, {})

      const pendingGroups = await prisma.experienceBooking.groupBy({
        by: ["sessionId"],
        where: {
          sessionId: { in: allSessionIds },
          status: "PENDING",
        },
        _sum: { guests: true },
      })
      pendingBySession = pendingGroups.reduce<Record<string, number>>((acc, g) => {
        acc[g.sessionId] = g._sum.guests || 0
        return acc
      }, {})
    }

    const payload = {
      experiences: experiences.map((exp) => ({
        id: exp.id,
        title: exp.title,
        duration: exp.duration,
        slug: exp.slug,
        currency: exp.currency,
        meetingCity: exp.meetingCity,
        location: exp.location,
        meetingAddress: exp.meetingAddress,
        sessions: exp.sessions.map((s) => ({
          id: s.id,
          startAt: s.startAt,
          duration: s.duration,
          capacity: s.capacity,
          locationLabel: s.locationLabel,
          meetingAddress: s.meetingAddress,
          reservedActive: reservedBySession[s.id] || 0,
          reservedPending: pendingBySession[s.id] || 0,
          bookings: s.bookings.map((b) => ({
            id: b.id,
            status: b.status,
            guests: b.guests,
            totalPrice: b.totalPrice,
            createdAt: b.createdAt,
            explorer: b.explorer,
          })),
        })),
      })),
    }

    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load grouped bookings. Please try again later."
    return NextResponse.json({ message }, { status: 500 })
  }
}


