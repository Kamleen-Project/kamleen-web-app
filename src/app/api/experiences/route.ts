import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { getUserSettingsData } from "@/lib/user-preferences"
import { prisma } from "@/lib/prisma"
import { saveUploadedFile } from "@/lib/uploads"
import { slugify } from "@/lib/slug"
import { buildExperienceWhere, experienceCardSelect, mapExperienceToCard } from "@/lib/experiences"

const DEFAULT_PAGE_SIZE = 6
const MAX_GALLERY_UPLOADS = 12

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

  const where = buildExperienceWhere({ query, location, startDate: start, guests })

  const skip = (page - 1) * pageSize

  const [experiences, total] = await Promise.all([
    prisma.experience.findMany({
      where: { AND: [where, { status: "PUBLISHED" }] },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: experienceCardSelect,
    }),
    prisma.experience.count({ where: { AND: [where, { status: "PUBLISHED" }] } }),
  ])

  const payload = experiences.map(mapExperienceToCard)
  const hasMore = skip + experiences.length < total

  return NextResponse.json({ experiences: payload, hasMore })
}

type SessionInput = {
  startAt: string
  duration?: string | null
  capacity: number
  priceOverride?: number | null
  locationLabel?: string | null
  meetingAddress?: string | null
  meetingLatitude?: number | null
  meetingLongitude?: number | null
}

type ItineraryInput = {
  id?: string
  order: number
  title: string
  subtitle?: string | null
  imageKey?: string
  imageUrl?: string
  duration?: string | null
}

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
    const statusParam = (getOptionalString(formData, "status") || "PUBLISHED").toUpperCase()
    const isDraft = statusParam === "DRAFT"

    const title = (getOptionalString(formData, "title") || (isDraft ? "Untitled experience" : null)) ?? getRequiredString(formData, "title")
    const summary = (getOptionalString(formData, "summary") || (isDraft ? "Coming soon" : null)) ?? getRequiredString(formData, "summary")
    const location = (getOptionalString(formData, "location") || (isDraft ? "TBD" : null)) ?? getRequiredString(formData, "location")
    const price = (() => {
      const p = getOptionalString(formData, "price")
      if (p == null && isDraft) return 0
      return parseInteger(getRequiredString(formData, "price"))
    })()
    const userSettings = await getUserSettingsData()
    const currency = (userSettings?.preferredCurrency || "USD").toUpperCase()
    const categoryId = getOptionalString(formData, "categoryId")
    const category = getOptionalString(formData, "category")
    const duration = (getOptionalString(formData, "duration") || (isDraft ? "0 min" : null)) ?? getRequiredString(formData, "duration")
    const description = getOptionalString(formData, "description")
    const audience = getRequiredAudience(formData)
    const tags = parseTags(formData.get("tags"))
    const sessionsInput = isDraft ? parseSessions(formData.get("sessions")) : parseSessions(formData.get("sessions"))
    const itineraryMeta = isDraft ? parseItinerary(formData.get("itinerary")) : parseItinerary(formData.get("itinerary"))

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
      const stored = await saveUploadedFile({
        file: heroImage,
        directory: `experiences/${session.user.id}`,
        maxSizeBytes: 10 * 1024 * 1024,
      })
      heroImagePath = stored.publicPath
    }

    const galleryEntries = formData.getAll("galleryImages")
    const galleryPaths: string[] = []
    for (const entry of galleryEntries.slice(0, MAX_GALLERY_UPLOADS)) {
      if (entry instanceof File && entry.size > 0) {
        const stored = await saveUploadedFile({
          file: entry,
          directory: `experiences/${session.user.id}/gallery`,
          maxSizeBytes: 10 * 1024 * 1024,
        })
        galleryPaths.push(stored.publicPath)
      }
    }

    const itinerarySteps = [] as {
      order: number
      title: string
      subtitle: string | null
      image: string
      duration: string | null
    }[]

    for (const step of itineraryMeta) {
      const titleValue = step.title.trim()
      if (!titleValue) {
        continue
      }

      let imagePath: string | null = null
      if (step.imageKey) {
        const file = formData.get(step.imageKey)
        if (!(file instanceof File) || file.size === 0) {
          throw new Error(`Image upload missing for itinerary step "${titleValue}"`)
        }
        const stored = await saveUploadedFile({
          file,
          directory: `experiences/${session.user.id}/itinerary`,
          maxSizeBytes: 10 * 1024 * 1024,
        })
        imagePath = stored.publicPath
      } else if (step.imageUrl) {
        imagePath = step.imageUrl
      }

      if (!imagePath) {
        imagePath = "/window.svg"
      }

      itinerarySteps.push({
        order: step.order,
        title: titleValue,
        subtitle: step.subtitle?.trim() || null,
        image: imagePath,
        duration: typeof step.duration === "string" && step.duration.trim() ? step.duration.trim() : null,
      })
    }

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
                  locationLabel: item.locationLabel ?? null,
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
        slug: true,
      },
    })

    return NextResponse.json({ ok: true, slug: created.slug }, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: "Unable to create experience" }, { status: 500 })
  }
}

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required`)
  }
  return value.trim()
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parseInteger(value: string) {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error("Price must be a positive number")
  }
  return parsed
}

function getRequiredAudience(formData: FormData) {
  const value = formData.get("audience")
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("audience is required")
  }
  const normalized = value.trim().toLowerCase()
  const allowed = new Set(["all", "men", "women", "kids"])
  if (!allowed.has(normalized)) {
    throw new Error("audience must be one of: all, men, women, kids")
  }
  return normalized
}

function parseTags(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return []
  }
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function parseSessions(value: FormDataEntryValue | null): SessionInput[] {
  if (typeof value !== "string") {
    return []
  }

  try {
    const parsed = JSON.parse(value) as SessionInput[]
    return parsed.map((session) => {
      if (!session.startAt) {
        throw new Error("Session start time is required")
      }
      const capacity = Number.parseInt(String(session.capacity ?? 0), 10)
      if (Number.isNaN(capacity) || capacity <= 0) {
        throw new Error("Session capacity must be greater than zero")
      }

      const locationLabel = typeof session.locationLabel === "string" && session.locationLabel.trim()
        ? session.locationLabel.trim()
        : null
      const meetingAddress = typeof session.meetingAddress === "string" && session.meetingAddress.trim()
        ? session.meetingAddress.trim()
        : null
      const duration = typeof session.duration === "string" && session.duration.trim() ? session.duration.trim() : null
      const meetingLatitude = typeof session.meetingLatitude === "number" ? session.meetingLatitude : null
      const meetingLongitude = typeof session.meetingLongitude === "number" ? session.meetingLongitude : null

      return {
        startAt: session.startAt,
        duration,
        capacity,
        priceOverride:
          session.priceOverride !== undefined && session.priceOverride !== null
            ? Number.parseInt(String(session.priceOverride), 10)
            : null,
        locationLabel,
        meetingAddress,
        meetingLatitude,
        meetingLongitude,
      }
    })
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid sessions payload: ${error.message}`)
    }
    throw new Error("Invalid sessions payload")
  }
}

function parseItinerary(value: FormDataEntryValue | null): ItineraryInput[] {
  if (typeof value !== "string" || !value.trim()) {
    return []
  }

  try {
    const parsed = JSON.parse(value) as ItineraryInput[]
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") {
          throw new Error("Invalid itinerary step")
        }
        const title = typeof item.title === "string" ? item.title.trim() : ""
        if (!title) {
          throw new Error("Each itinerary step must include a title")
        }
        const order = Number.parseInt(String(item.order ?? 0), 10)
        if (Number.isNaN(order) || order < 0) {
          throw new Error("Each itinerary step must include a valid order")
        }
        return {
          id: item.id,
          order,
          title,
          subtitle: typeof item.subtitle === "string" ? item.subtitle.trim() : null,
          imageKey: item.imageKey,
          imageUrl: item.imageUrl,
          duration: typeof item.duration === "string" && item.duration.trim() ? item.duration.trim() : null,
        }
      })
      .sort((a, b) => a.order - b.order)
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid itinerary payload: ${error.message}`)
    }
    throw new Error("Invalid itinerary payload")
  }
}

function parseOptionalCoordinate(value: FormDataEntryValue | null, key: string) {
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  const parsed = Number.parseFloat(trimmed)
  if (Number.isNaN(parsed)) {
    return null
  }
  return parsed
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
