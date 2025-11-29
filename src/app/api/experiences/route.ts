import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { getUserSettingsData } from "@/lib/user-preferences"
import { prisma } from "@/lib/prisma"
import { saveUploadedFile } from "@/lib/uploads"
import { slugify } from "@/lib/slug"
import { buildExperienceWhere, experienceCardSelect, mapExperienceToCard } from "@/lib/experiences"
import {
  getRequiredString,
  getOptionalString,
  parseInteger,
  getRequiredAudience,
  parseTags,
  parseSessions,
  parseSessionsLenient,
  parseItinerary,
  parseItineraryLenient,
  parseOptionalCoordinate,
  type SessionInput,
  type ItineraryInput,
} from "@/lib/experience-parse"
import { MAX_GALLERY_IMAGES } from "@/config/experiences"
import { resolveItineraryStepsFromMeta } from "@/lib/itinerary-upload"
import { isAllowedImageFile } from "@/lib/media"

const DEFAULT_PAGE_SIZE = 6

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const page = Math.max(Number.parseInt(searchParams.get("page") ?? "1", 10), 1)
  const pageSize = Math.min(
    Math.max(Number.parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10), 1),
    24
  )
  const query = searchParams.get("q")
  const location = searchParams.get("location")
  const start = searchParams.get("start")
  const guestsParam = searchParams.get("guests")
  const guests = guestsParam ? Number.parseInt(guestsParam, 10) || null : null
  const categoryId = searchParams.get("categoryId")
  const categorySlug = searchParams.get("categorySlug")

  const where = buildExperienceWhere({ query, location, startDate: start, guests })

  const skip = (page - 1) * pageSize

  const categoryFilter = await (async () => {
    if (categoryId) return { categoryId }
    if (categorySlug) {
      const found = await prisma.experienceCategory.findUnique({ where: { slug: categorySlug }, select: { id: true } })
      if (found) return { categoryId: found.id }
    }
    return {}
  })()

  const [experiences, total] = await Promise.all([
    prisma.experience.findMany({
      where: { AND: [where, categoryFilter, { status: "PUBLISHED" }] },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: experienceCardSelect,
    }),
    prisma.experience.count({ where: { AND: [where, categoryFilter, { status: "PUBLISHED" }] } }),
  ])

  const payload = experiences.map(mapExperienceToCard)
  const hasMore = skip + experiences.length < total

  return NextResponse.json({ experiences: payload, hasMore })
}

// Types moved to shared util

export async function POST(request: Request) {
  const session = await getServerAuthSession()

  if (!session?.user || session.user.activeRole !== "ORGANIZER") {
    return NextResponse.json({ message: "Only organizers can create experiences" }, { status: 403 })
  }

  const contentType = request.headers.get("content-type") ?? ""

  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ message: "Unsupported content type" }, { status: 400 })
  }

  const formData = await request.formData()

  try {
    const statusParam = (getOptionalString(formData, "status") || "DRAFT").toUpperCase()
    const isDraft = statusParam === "DRAFT"

    const title = getRequiredString(formData, "title")
    const summary = isDraft
      ? getOptionalString(formData, "summary") ?? ""
      : getRequiredString(formData, "summary")
    const location = (getOptionalString(formData, "location") || (isDraft ? "TBD" : null)) ?? getRequiredString(formData, "location")
    const price = (() => {
      const p = getOptionalString(formData, "price")
      if (p == null && isDraft) return 0
      return parseInteger(getRequiredString(formData, "price"))
    })()
    const userSettings = await getUserSettingsData()
    const currency = (userSettings?.preferredCurrency || "MAD").toUpperCase()
    const categoryId = getOptionalString(formData, "categoryId")
    const category = getOptionalString(formData, "category")
    const duration = (getOptionalString(formData, "duration") || (isDraft ? "0 min" : null)) ?? getRequiredString(formData, "duration")
    const description = getOptionalString(formData, "description")
    const audience = getRequiredAudience(formData)
    const tags = parseTags(formData.get("tags"))
    const sessionsInput = isDraft ? parseSessionsLenient(formData.get("sessions")) : parseSessions(formData.get("sessions"))
    const itineraryMeta = isDraft ? parseItineraryLenient(formData.get("itinerary")) : parseItinerary(formData.get("itinerary"))

    const meetingAddress = getOptionalString(formData, "meetingAddress")
    const meetingCity = getOptionalString(formData, "meetingCity")
    const meetingCountry = getOptionalString(formData, "meetingCountry")
    const countryId = getOptionalString(formData, "countryId")
    const stateId = getOptionalString(formData, "stateId")
    const cityId = getOptionalString(formData, "cityId")

    const resolvedCategoryId = categoryId ?? null

    let resolvedCategory: string | null = category ?? null
    if (!resolvedCategory && resolvedCategoryId) {
      const found = await prisma.experienceCategory.findUnique({ where: { id: resolvedCategoryId }, select: { name: true } })
      if (!found) {
        return NextResponse.json({ message: "Invalid categoryId" }, { status: 400 })
      }
      resolvedCategory = found.name
    }
    const meetingLatitude = parseOptionalCoordinate(formData.get("meetingLatitude"), "meetingLatitude")
    const meetingLongitude = parseOptionalCoordinate(formData.get("meetingLongitude"), "meetingLongitude")

    if (stateId) {
      const state = await prisma.state.findUnique({ where: { id: stateId }, select: { countryId: true } })
      if (!state) {
        return NextResponse.json({ message: "Invalid stateId" }, { status: 400 })
      }
      if (countryId && state.countryId !== countryId) {
        return NextResponse.json({ message: "State does not belong to provided country" }, { status: 400 })
      }
    }

    if (cityId) {
      const city = await prisma.city.findUnique({ where: { id: cityId }, select: { countryId: true, stateId: true } })
      if (!city) {
        return NextResponse.json({ message: "Invalid cityId" }, { status: 400 })
      }
      if (countryId && city.countryId !== countryId) {
        return NextResponse.json({ message: "City does not belong to provided country" }, { status: 400 })
      }
      if (stateId && city.stateId && city.stateId !== stateId) {
        return NextResponse.json({ message: "City does not belong to provided state" }, { status: 400 })
      }
    }

    if (!isDraft) {
      if (sessionsInput.length === 0) {
        throw new Error("At least one session is required")
      }
    }

    if (!isDraft) {
      if (!itineraryMeta.length) {
        throw new Error("At least one itinerary step is required")
      }
    }

    const slug = await generateUniqueSlug(title)

    let heroImagePath: string | null = null
    const heroImage = formData.get("heroImage")
    if (heroImage instanceof File && heroImage.size > 0) {
      if (!isAllowedImageFile(heroImage)) {
        throw new Error("Unsupported hero image type")
      }
      const stored = await saveUploadedFile({
        file: heroImage,
        directory: `experiences/${session.user.id}`,
        maxSizeBytes: 10 * 1024 * 1024,
      })
      heroImagePath = stored.publicPath
    }
    if (!heroImagePath) {
      const heroImageUrl = getOptionalString(formData, "heroImageUrl")
      if (heroImageUrl) {
        heroImagePath = heroImageUrl
      }
    }

    const galleryEntries = formData.getAll("galleryImages")
    const galleryPaths: string[] = []
    for (const entry of galleryEntries.slice(0, MAX_GALLERY_IMAGES)) {
      if (entry instanceof File && entry.size > 0) {
        if (!isAllowedImageFile(entry)) {
          throw new Error("Unsupported gallery image type")
        }
        const stored = await saveUploadedFile({
          file: entry,
          directory: `experiences/${session.user.id}/gallery`,
          maxSizeBytes: 10 * 1024 * 1024,
        })
        galleryPaths.push(stored.publicPath)
      }
    }

    // Optionally accept pre-uploaded gallery URLs
    const galleryUrlsRaw = formData.get("galleryImageUrls")
    if (typeof galleryUrlsRaw === "string" && galleryUrlsRaw.trim()) {
      try {
        const parsed = JSON.parse(galleryUrlsRaw) as unknown
        if (Array.isArray(parsed)) {
          for (const url of parsed) {
            if (typeof url === "string" && url && galleryPaths.length < MAX_GALLERY_IMAGES) {
              galleryPaths.push(url)
            }
          }
        }
      } catch {
        // ignore bad payload; server already accepts files
      }
    }

    const itinerarySteps = await resolveItineraryStepsFromMeta(formData, itineraryMeta, session.user.id)

    if (!isDraft) {
      if (!itinerarySteps.length) {
        throw new Error("At least one itinerary step is required")
      }
    }

    const created = await prisma.experience.create({
      data: {
        organizerId: session.user.id,
        title,
        summary,
        description,
        location,
        status: isDraft ? "DRAFT" : "PUBLISHED",
        price,
        currency,
        duration,
        category: resolvedCategory ?? "general",
        categoryId: resolvedCategoryId,
        audience,
        tags,
        slug,
        heroImage: heroImagePath,
        galleryImages: galleryPaths,
        meetingAddress,
        meetingCity,
        meetingCountry,
        meetingLatitude,
        meetingLongitude,
        countryId: countryId ?? null,
        stateId: stateId ?? null,
        cityId: cityId ?? null,
        ...(sessionsInput.length
          ? {
            sessions: {
              create: sessionsInput.map((item) => ({
                startAt: new Date(item.startAt),
                duration: item.duration ?? null,
                capacity: item.capacity,
                priceOverride: item.priceOverride ?? null,
                meetingAddress: item.meetingAddress ?? null,
                meetingLatitude: item.meetingLatitude ?? null,
                meetingLongitude: item.meetingLongitude ?? null,
              })),
            },
          }
          : {}),
        ...(itinerarySteps.length
          ? {
            itinerarySteps: {
              create: itinerarySteps
                .sort((a, b) => a.order - b.order)
                .map((step) => ({
                  order: step.order,
                  title: step.title,
                  subtitle: step.subtitle,
                  image: step.image,
                  duration: step.duration,
                })),
            },
          }
          : {}),
      },
      select: {
        id: true,
        slug: true,
      },
    })

    return NextResponse.json({ ok: true, id: created.id, slug: created.slug }, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: "Unable to create experience" }, { status: 500 })
  }
}
async function generateUniqueSlug(title: string) {
  const base = slugify(title) || "experience"
  let slug = base
  let suffix = 1

  while (true) {
    const existing = await prisma.experience.findUnique({ where: { slug } })
    if (!existing) {
      return slug
    }
    slug = `${base}-${suffix}`
    suffix += 1
  }
}
