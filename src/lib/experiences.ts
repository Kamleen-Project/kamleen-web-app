import type { Prisma } from "@/generated/prisma"

export type ExperienceSearchFilters = {
  query?: string | null
  location?: string | null
  startDate?: string | null
  guests?: number | null
}

export const experienceCardSelect = {
  id: true,
  title: true,
  summary: true,
  location: true,
  duration: true,
  category: true,
  audience: true,
  status: true,
  verificationStatus: true,
  countryId: true,
  stateId: true,
  cityId: true,
  categoryId: true,
  averageRating: true,
  reviewCount: true,
  price: true,
  heroImage: true,
  slug: true,
  currency: true,
  bookings: {
    where: { status: { in: ["PENDING", "CONFIRMED"] } },
    select: { id: true },
    take: 1,
  },
  sessions: {
    select: {
      id: true,
      startAt: true,
      duration: true,
      bookings: {
        where: { status: { in: ["PENDING", "CONFIRMED"] } },
        select: { status: true },
      },
    },
    orderBy: [
      {
        startAt: "asc",
      },
    ],
  },
} satisfies Prisma.ExperienceSelect

export type ExperienceCardPayload = Prisma.ExperienceGetPayload<{ select: typeof experienceCardSelect }>

export function buildExperienceWhere(filters: ExperienceSearchFilters): Prisma.ExperienceWhereInput {
  const conditions: Prisma.ExperienceWhereInput[] = []

  if (filters.query && filters.query.trim()) {
    const query = filters.query.trim()
    conditions.push({
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { summary: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { location: { contains: query, mode: "insensitive" } },
        { tags: { has: query.toLowerCase() } },
      ],
    })
  }

  if (filters.location && filters.location.trim()) {
    const location = filters.location.trim()
    conditions.push({
      location: { contains: location, mode: "insensitive" },
    })
  }

  const guests = filters.guests ?? null
  const startDateValue = filters.startDate ? new Date(filters.startDate) : null
  const hasValidStart = startDateValue && !Number.isNaN(startDateValue.getTime())

  if (hasValidStart && guests && guests > 0) {
    conditions.push({
      sessions: {
        some: {
          AND: [
            { startAt: { gte: startDateValue! } },
            { capacity: { gte: guests } },
          ],
        },
      },
    })
  } else if (hasValidStart) {
    conditions.push({
      sessions: {
        some: {
          startAt: { gte: startDateValue! },
        },
      },
    })
  } else if (guests && guests > 0) {
    conditions.push({
      sessions: {
        some: {
          capacity: { gte: guests },
        },
      },
    })
  }

  if (!conditions.length) {
    return {}
  }

  return { AND: conditions }
}

export function mapExperienceToCard(experience: ExperienceCardPayload) {
  const now = new Date()
  let activeReservations = 0
  let pastReservations = 0
  const sessions = (experience.sessions ?? []) as Array<{
    id: string
    startAt: Date
    duration?: string | null
    bookings?: Array<{ status: "PENDING" | "CONFIRMED" }>
  }>
  for (const s of sessions) {
    const isPast = new Date(s.startAt) < now
    const bookings = Array.isArray(s.bookings) ? s.bookings : []
    if (isPast) {
      pastReservations += bookings.filter((b) => b.status === "CONFIRMED").length
    } else {
      activeReservations += bookings.length
    }
  }
  const hasActiveFutureBookings = sessions.some((s) => new Date(s.startAt) >= now && Array.isArray(s.bookings) && s.bookings.length > 0)

  return {
    id: experience.id,
    title: experience.title,
    summary: experience.summary,
    location: experience.location,
    status: (experience as unknown as { status?: string }).status,
    verificationStatus: (experience as unknown as { verificationStatus?: string }).verificationStatus,
    // Whether there are any active future bookings among upcoming sessions
    countryId: experience.countryId ?? undefined,
    stateId: experience.stateId ?? undefined,
    cityId: experience.cityId ?? undefined,
    categoryId: experience.categoryId ?? undefined,
    category: experience.category ?? undefined,
    audience: experience.audience ?? undefined,
    rating: experience.averageRating ?? 0,
    reviews: experience.reviewCount ?? 0,
    price: experience.price,
    image: experience.heroImage ?? undefined,
    currency: experience.currency ?? "USD",
    slug: experience.slug,
    duration: experience.duration ?? undefined,
    sessions: experience.sessions?.map((session) => ({
      id: session.id,
      startAt: session.startAt.toISOString(),
      duration: session.duration ?? undefined,
    })),
    hasActiveBookingsFlag: hasActiveFutureBookings,
    activeReservations,
    pastReservations,
  }
}
