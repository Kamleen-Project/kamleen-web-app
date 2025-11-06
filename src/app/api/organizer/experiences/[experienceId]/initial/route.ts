import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getServerAuthSession } from "@/lib/auth"

export async function GET(_request: Request, { params }: { params: Promise<{ experienceId: string }> }) {
  const session = await getServerAuthSession()
  if (!session?.user) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 })
  }

  const { experienceId } = await params

  const experience = await prisma.experience.findFirst({
    where: { id: experienceId, organizerId: session.user.id },
    select: {
      id: true,
      verificationStatus: true,
      title: true,
      summary: true,
      description: true,
      location: true,
      duration: true,
      price: true,
      currency: true,
      category: true,
      categoryId: true,
      audience: true,
      tags: true,
      heroImage: true,
      galleryImages: true,
      meetingAddress: true,
      meetingCity: true,
      meetingCountry: true,
      meetingLatitude: true,
      meetingLongitude: true,
      countryId: true,
      stateId: true,
      cityId: true,
      sessions: {
        orderBy: { startAt: "asc" },
        select: {
          id: true,
          startAt: true,
          duration: true,
          capacity: true,
          priceOverride: true,
          locationLabel: true,
          meetingAddress: true,
          meetingLatitude: true,
          meetingLongitude: true,
          bookings: {
            where: { status: { in: ["PENDING", "CONFIRMED"] } },
            select: { guests: true },
          },
        },
      },
      itinerarySteps: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, subtitle: true, image: true, order: true, duration: true },
      },
    },
  })

  if (!experience) {
    return NextResponse.json({ message: "Not found" }, { status: 404 })
  }

  const initial = {
    id: experience.id,
    verificationStatus: experience.verificationStatus,
    title: experience.title,
    summary: experience.summary,
    description: experience.description,
    audience: experience.audience ?? "all",
    category: experience.category ?? "general",
    categoryId: experience.categoryId ?? null,
    duration: experience.duration,
    price: experience.price,
    currency: experience.currency,
    tags: experience.tags,
    location: experience.location,
    heroImage: experience.heroImage,
    galleryImages: experience.galleryImages ?? [],
    meeting: {
      address: experience.meetingAddress,
      city: experience.meetingCity,
      country: experience.meetingCountry,
      latitude: experience.meetingLatitude ? Number(experience.meetingLatitude) : null,
      longitude: experience.meetingLongitude ? Number(experience.meetingLongitude) : null,
    },
    countryId: experience.countryId ?? null,
    stateId: experience.stateId ?? null,
    cityId: experience.cityId ?? null,
    itinerary: experience.itinerarySteps.map((step) => ({
      id: step.id,
      title: step.title,
      subtitle: step.subtitle,
      image: step.image,
      order: step.order,
      duration: step.duration,
    })),
    sessions: experience.sessions.map((session) => ({
      id: session.id,
      startAt: session.startAt.toISOString(),
      duration: session.duration ?? null,
      capacity: session.capacity,
      priceOverride: session.priceOverride,
      locationLabel: session.locationLabel,
      meetingAddress: session.meetingAddress,
      meetingLatitude: session.meetingLatitude ? Number(session.meetingLatitude) : null,
      meetingLongitude: session.meetingLongitude ? Number(session.meetingLongitude) : null,
      reservedGuests: Array.isArray(session.bookings)
        ? session.bookings.reduce((acc, b) => acc + (b.guests || 0), 0)
        : 0,
    })),
  }

  return NextResponse.json({ initial })
}


