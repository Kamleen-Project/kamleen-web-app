import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveUploadedFile } from "@/lib/uploads"

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

const MAX_GALLERY_UPLOADS = 12

export async function POST(request: Request) {
  const session = await getServerAuthSession()
  if (!session?.user) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 })
  }

  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ message: "Unsupported content type" }, { status: 400 })
  }

  const formData = await request.formData()

  // Organizer intro fields
  const aboutSelf = getOptionalString(formData, "organizerAboutSelf")
  const aboutExperience = getOptionalString(formData, "organizerAboutExperience")
  const termsAccepted = String(formData.get("organizerTermsAccepted") ?? "false").toLowerCase() === "true"

  if (!aboutSelf || aboutSelf.length < 30) {
    return NextResponse.json({ message: "Tell us about yourself (min 30 chars)" }, { status: 400 })
  }
  if (!aboutExperience || aboutExperience.length < 30) {
    return NextResponse.json({ message: "Tell us about your experience (min 30 chars)" }, { status: 400 })
  }
  if (!termsAccepted) {
    return NextResponse.json({ message: "Please accept organizer terms" }, { status: 400 })
  }

  // Persist a draft experience using the existing creation rules but as DRAFT
  try {
    const applicant = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, preferredCurrency: true },
    })

    if (!applicant) {
      return NextResponse.json({ message: "Unable to locate your profile. Please sign in again." }, { status: 404 })
    }

    const status = "DRAFT" as const
    const title = getOptionalString(formData, "title") || "Untitled experience"
    const summary = getOptionalString(formData, "summary") || "Coming soon"
    const location = getOptionalString(formData, "location") || "TBD"
    const price = (() => {
      const raw = getOptionalString(formData, "price") || "0"
      const parsed = Number.parseInt(raw, 10)
      return Number.isNaN(parsed) ? 0 : Math.max(0, parsed)
    })()
    const categoryId = getOptionalString(formData, "categoryId")
    const category = getOptionalString(formData, "category") || "general"
    const duration = getOptionalString(formData, "duration") || "0 min"
    const description = getOptionalString(formData, "description")
    const audience = getOptionalString(formData, "audience") || "all"
    const tags = parseTags(formData.get("tags"))

    const meetingAddress = getOptionalString(formData, "meetingAddress")
    const meetingCity = getOptionalString(formData, "meetingCity")
    const meetingCountry = getOptionalString(formData, "meetingCountry")
    const countryId = getOptionalString(formData, "countryId")
    const stateId = getOptionalString(formData, "stateId")
    const cityId = getOptionalString(formData, "cityId")
    const meetingLatitude = parseOptionalCoordinate(formData.get("meetingLatitude"))
    const meetingLongitude = parseOptionalCoordinate(formData.get("meetingLongitude"))

    const currency = (applicant.preferredCurrency ?? "USD").toUpperCase()

    let heroImagePath: string | null = null
    const heroImage = formData.get("heroImage")
    if (heroImage instanceof File && heroImage.size > 0) {
      try {
        const stored = await saveUploadedFile({
          file: heroImage,
          directory: `experiences/${session.user.id}`,
          maxSizeBytes: 10 * 1024 * 1024,
        })
        heroImagePath = stored.publicPath
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to store hero image"
        return NextResponse.json({ message }, { status: 400 })
      }
    }

    const galleryEntries = formData.getAll("galleryImages")
    const galleryPaths: string[] = []
    for (const entry of galleryEntries.slice(0, MAX_GALLERY_UPLOADS)) {
      if (entry instanceof File && entry.size > 0) {
        try {
          const stored = await saveUploadedFile({
            file: entry,
            directory: `experiences/${session.user.id}/gallery`,
            maxSizeBytes: 10 * 1024 * 1024,
          })
          galleryPaths.push(stored.publicPath)
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to store gallery image"
          return NextResponse.json({ message }, { status: 400 })
        }
      }
    }

    let sessionsInput: SessionInput[]
    try {
      sessionsInput = parseSessions(formData.get("sessions"))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid sessions payload"
      return NextResponse.json({ message }, { status: 400 })
    }

    let itineraryMeta: ItineraryInput[]
    try {
      itineraryMeta = parseItinerary(formData.get("itinerary"))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid itinerary payload"
      return NextResponse.json({ message }, { status: 400 })
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
      if (!titleValue) continue

      let imagePath: string | null = null
      if (step.imageKey) {
        const file = formData.get(step.imageKey)
        if (file instanceof File && file.size > 0) {
          try {
            const stored = await saveUploadedFile({
              file,
              directory: `experiences/${session.user.id}/itinerary`,
              maxSizeBytes: 10 * 1024 * 1024,
            })
            imagePath = stored.publicPath
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to store itinerary image"
            return NextResponse.json({ message }, { status: 400 })
          }
        }
      }

      if (!imagePath && step.imageUrl) {
        imagePath = step.imageUrl
      }

      if (!imagePath) {
        imagePath = "/window.svg"
      }

      itinerarySteps.push({
        order: step.order,
        title: titleValue,
        subtitle: typeof step.subtitle === "string" && step.subtitle.trim() ? step.subtitle.trim() : null,
        image: imagePath,
        duration: typeof step.duration === "string" && step.duration.trim() ? step.duration.trim() : null,
      })
    }

    const created = await prisma.experience.create({
      data: {
        organizerId: applicant.id,
        title,
        summary,
        description,
        location,
        status,
        price,
        currency,
        duration,
        category,
        categoryId: categoryId ?? null,
        audience,
        tags,
        slug: await generateTempSlug(),
        heroImage: heroImagePath,
        galleryImages: galleryPaths,
        meetingAddress: meetingAddress ?? null,
        meetingCity: meetingCity ?? null,
        meetingCountry: meetingCountry ?? null,
        meetingLatitude,
        meetingLongitude,
        countryId: countryId ?? null,
        stateId: stateId ?? null,
        cityId: cityId ?? null,
        ...(sessionsInput.length
          ? {
              sessions: {
                create: sessionsInput.map((session) => ({
                  startAt: new Date(session.startAt),
                  duration: session.duration ?? null,
                  capacity: session.capacity,
                  priceOverride: session.priceOverride ?? null,
                  locationLabel: session.locationLabel ?? null,
                  meetingAddress: session.meetingAddress ?? null,
                  meetingLatitude: session.meetingLatitude ?? null,
                  meetingLongitude: session.meetingLongitude ?? null,
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
      select: { id: true },
    })

    await prisma.user.update({
      where: { id: applicant.id },
      data: { organizerStatus: "PENDING" },
    })

    // Store the organizer intro answers in the user's bio/headline as an interim measure
    await prisma.user.update({
      where: { id: applicant.id },
      data: {
        headline: aboutSelf.slice(0, 200),
        bio: (() => {
          const prev = aboutExperience
          return prev.length > 1000 ? prev.slice(0, 1000) : prev
        })(),
      },
    })

    return NextResponse.json({ ok: true, experienceId: created.id }, { status: 201 })
  } catch (error) {
    console.error("[organizer/apply]", error)
    const message = error instanceof Error ? error.message : "Unable to submit organizer request"
    return NextResponse.json({ message }, { status: 500 })
  }
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parseTags(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return [] as string[]
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
}

function parseOptionalCoordinate(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number.parseFloat(trimmed)
  return Number.isNaN(parsed) ? null : parsed
}

function parseSessions(value: FormDataEntryValue | null): SessionInput[] {
  if (typeof value !== "string" || !value.trim()) {
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

      const duration = typeof session.duration === "string" && session.duration.trim() ? session.duration.trim() : null
      const locationLabel = typeof session.locationLabel === "string" && session.locationLabel.trim()
        ? session.locationLabel.trim()
        : null
      const meetingAddress = typeof session.meetingAddress === "string" && session.meetingAddress.trim()
        ? session.meetingAddress.trim()
        : null

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
        meetingLatitude:
          typeof session.meetingLatitude === "number" ? session.meetingLatitude : parseOptionalCoordinateFromUnknown(session.meetingLatitude),
        meetingLongitude:
          typeof session.meetingLongitude === "number" ? session.meetingLongitude : parseOptionalCoordinateFromUnknown(session.meetingLongitude),
      }
    })
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid sessions payload: ${error.message}`)
    }
    throw new Error("Invalid sessions payload")
  }
}

function parseOptionalCoordinateFromUnknown(value: unknown) {
  if (typeof value === "number") {
    return value
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = Number.parseFloat(trimmed)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
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

async function generateTempSlug() {
  // Temporary unique slug for drafts created via organizer application
  const base = `draft-${Math.random().toString(36).slice(2, 8)}`
  let slug = base
  let suffix = 1
  while (true) {
    const exists = await prisma.experience.findUnique({ where: { slug } })
    if (!exists) return slug
    slug = `${base}-${suffix}`
    suffix += 1
  }
}
