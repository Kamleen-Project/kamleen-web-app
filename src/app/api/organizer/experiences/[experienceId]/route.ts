import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getUserSettingsData } from "@/lib/user-preferences"
import { saveUploadedFile } from "@/lib/uploads"

const MAX_GALLERY_UPLOADS = 12

export async function PATCH(request: Request, { params }: { params: Promise<{ experienceId: string }> }) {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 })
  }

  const isAdmin = session.user.role === "ADMIN"

  const { experienceId } = await params

  const experience = await prisma.experience.findFirst({
    where: {
      id: experienceId,
      ...(isAdmin ? {} : { organizerId: session.user.id }),
    },
    select: {
      id: true,
      slug: true,
      organizerId: true,
      heroImage: true,
      galleryImages: true,
    },
  })

  if (!experience) {
    return NextResponse.json({ message: "Experience not found" }, { status: 404 })
  }

  if (!isAdmin && experience.organizerId !== session.user.id) {
    return NextResponse.json({ message: "Not allowed" }, { status: 403 })
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
    const category = (getOptionalString(formData, "category") || (isDraft ? "general" : null)) ?? getRequiredString(formData, "category")
    const duration = (getOptionalString(formData, "duration") || (isDraft ? "0 min" : null)) ?? getRequiredString(formData, "duration")
    const description = getOptionalString(formData, "description")
    const tags = parseTags(formData.get("tags"))
    const audience = getRequiredAudience(formData)
    const sessionsInput = isDraft ? parseSessionsLenient(formData.get("sessions")) : parseSessions(formData.get("sessions"))
    const itineraryMeta = isDraft ? parseItineraryLenient(formData.get("itinerary")) : parseItinerary(formData.get("itinerary"))

    const meetingAddress = getOptionalString(formData, "meetingAddress")
    const meetingCity = getOptionalString(formData, "meetingCity")
    const meetingCountry = getOptionalString(formData, "meetingCountry")
    const meetingLatitude = parseOptionalCoordinate(formData.get("meetingLatitude"), "meetingLatitude")
    const meetingLongitude = parseOptionalCoordinate(formData.get("meetingLongitude"), "meetingLongitude")
    const categoryId = getOptionalString(formData, "categoryId")
    const countryId = getOptionalString(formData, "countryId")
    const stateId = getOptionalString(formData, "stateId")
    const cityId = getOptionalString(formData, "cityId")

    let resolvedCategory = category
    if (categoryId) {
      const found = await prisma.experienceCategory.findUnique({ where: { id: categoryId }, select: { name: true } })
      if (!found) {
        return NextResponse.json({ message: "Invalid categoryId" }, { status: 400 })
      }
      resolvedCategory = found.name
    }

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
      if (!sessionsInput.length) {
        throw new Error("At least one session is required")
      }
      if (!itineraryMeta.length) {
        throw new Error("At least one itinerary step is required")
      }
    }

    let heroImagePath = experience.heroImage
    const heroImage = formData.get("heroImage")
    if (heroImage instanceof File && heroImage.size > 0) {
      const stored = await saveUploadedFile({
        file: heroImage,
        directory: `experiences/${experience.organizerId}`,
        maxSizeBytes: 10 * 1024 * 1024,
      })
      heroImagePath = stored.publicPath
    }

    const removeHero = parseBoolean(formData.get("removeHero"))
    if (removeHero) {
      heroImagePath = null
    }

    const updatedGallery = new Set(experience.galleryImages ?? [])
    const removeGalleryEntries = parseRemoveGallery(formData.get("removeGallery"))
    for (const item of removeGalleryEntries) {
      updatedGallery.delete(item)
    }

    const galleryFiles = formData.getAll("galleryImages")
    for (const entry of galleryFiles) {
      if (!(entry instanceof File) || entry.size === 0) continue
      if (updatedGallery.size >= MAX_GALLERY_UPLOADS) break
      const stored = await saveUploadedFile({
        file: entry,
        directory: `experiences/${experience.organizerId}/gallery`,
        maxSizeBytes: 10 * 1024 * 1024,
      })
      updatedGallery.add(stored.publicPath)
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
          directory: `experiences/${experience.organizerId}/itinerary`,
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
    // allow empty itinerary for drafts
    if (!isDraft) {
      if (!itinerarySteps.length) {
        throw new Error("At least one itinerary step is required")
      }
    }
    }

    await prisma.$transaction(async (tx) => {
      await tx.experience.update({
        where: { id: experience.id },
        data: {
          title,
          summary,
          description,
          location,
          status: isDraft ? "DRAFT" : "PUBLISHED",
          price,
          currency,
          category: resolvedCategory,
          categoryId,
          duration,
          audience,
          tags,
          heroImage: heroImagePath,
          galleryImages: Array.from(updatedGallery),
          meetingAddress,
          meetingCity,
          meetingCountry,
          meetingLatitude,
          meetingLongitude,
          countryId: countryId ?? null,
          stateId: stateId ?? null,
          cityId: cityId ?? null,
        },
      })

      // Fetch existing sessions with active reservations
      const existingSessions = await tx.experienceSession.findMany({
        where: { experienceId: experience.id },
        include: {
          bookings: {
            where: { status: { in: ["PENDING", "CONFIRMED"] } },
            select: { guests: true },
          },
        },
      })

      const incomingById = new Map<string, SessionInput & { id?: string }>()
      for (const s of sessionsInput) {
        if (typeof (s as { id?: unknown }).id === "string") {
          incomingById.set(((s as { id?: string }).id) as string, s)
        }
      }

      // Determine deletions: existing not present in incoming
      const toDelete = existingSessions.filter((s) => !incomingById.has(s.id))
      for (const s of toDelete) {
        const reservedGuests = (s.bookings ?? []).reduce((acc, b) => acc + (b.guests || 0), 0)
        if (reservedGuests > 0) {
          throw new Error("Cannot remove session that already has reservations")
        }
      }
      // Safe delete sessions without reservations
      if (toDelete.length) {
        await tx.experienceSession.deleteMany({ where: { id: { in: toDelete.map((s) => s.id) } } })
      }

      // Updates and creates
      const existingById = new Map(existingSessions.map((s) => [s.id, s]))
      for (const s of sessionsInput) {
        const maybeId = (s as { id?: string }).id
        if (maybeId && existingById.has(maybeId)) {
          const current = existingById.get(maybeId)!
          const reservedGuests = (current.bookings ?? []).reduce((acc, b) => acc + (b.guests || 0), 0)
          if (s.capacity < reservedGuests) {
            throw new Error(`Capacity for a session with reservations cannot be less than reserved (${reservedGuests})`)
          }
          await tx.experienceSession.update({
            where: { id: maybeId },
            data: {
              startAt: new Date(s.startAt),
              duration: s.duration ?? null,
              capacity: s.capacity,
              priceOverride: s.priceOverride ?? null,
              locationLabel: s.locationLabel ?? null,
              meetingAddress: s.meetingAddress ?? null,
              meetingLatitude: s.meetingLatitude ?? null,
              meetingLongitude: s.meetingLongitude ?? null,
            },
          })
        } else {
          await tx.experienceSession.create({
            data: {
              experienceId: experience.id,
              startAt: new Date(s.startAt),
              duration: s.duration ?? null,
              capacity: s.capacity,
              priceOverride: s.priceOverride ?? null,
              locationLabel: s.locationLabel ?? null,
              meetingAddress: s.meetingAddress ?? null,
              meetingLatitude: s.meetingLatitude ?? null,
              meetingLongitude: s.meetingLongitude ?? null,
            },
          })
        }
      }

      await tx.experienceItineraryStep.deleteMany({ where: { experienceId: experience.id } })
      if (itinerarySteps.length) {
        await tx.experienceItineraryStep.createMany({
          data: itinerarySteps
            .sort((a, b) => a.order - b.order)
            .map((step) => ({
              experienceId: experience.id,
              order: step.order,
              title: step.title,
              subtitle: step.subtitle,
              image: step.image,
              duration: step.duration,
            })),
        })
      }
    })

    return NextResponse.json({ ok: true, slug: experience.slug })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }
    return NextResponse.json({ message: "Unable to update experience" }, { status: 500 })
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
    const parsed = JSON.parse(value) as Array<Record<string, unknown>>
    return parsed.map((raw) => {
      const session = raw as {
        id?: unknown
        startAt?: unknown
        capacity?: unknown
        duration?: unknown
        priceOverride?: unknown
        locationLabel?: unknown
        meetingAddress?: unknown
        meetingLatitude?: unknown
        meetingLongitude?: unknown
      }
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
        id: typeof session.id === "string" ? session.id : undefined,
        startAt: String(session.startAt),
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

function parseSessionsLenient(value: FormDataEntryValue | null): SessionInput[] {
  if (typeof value !== "string") {
    return []
  }
  try {
    const parsed = JSON.parse(value) as Array<Record<string, unknown>>
    const result: SessionInput[] = []
    for (const session of parsed) {
      if (!session || typeof session !== "object") continue
      if (!session.startAt) continue
      const capacity = Number.parseInt(String(session.capacity ?? 0), 10)
      if (Number.isNaN(capacity) || capacity <= 0) continue
      result.push({
        id: typeof (session as { id?: unknown }).id === "string" ? ((session as { id?: string }).id as string) : undefined,
        startAt: String((session as { startAt: unknown }).startAt),
        duration: typeof (session as { duration?: unknown }).duration === "string" && String((session as { duration?: string }).duration).trim()
          ? String((session as { duration?: string }).duration).trim()
          : null,
        capacity,
        priceOverride:
          (session as { priceOverride?: unknown }).priceOverride !== undefined && (session as { priceOverride?: unknown }).priceOverride !== null
            ? Number.parseInt(String((session as { priceOverride?: unknown }).priceOverride), 10)
            : null,
        locationLabel:
          typeof (session as { locationLabel?: unknown }).locationLabel === "string" && String((session as { locationLabel?: string }).locationLabel).trim()
            ? String((session as { locationLabel?: string }).locationLabel).trim()
            : null,
        meetingAddress:
          typeof (session as { meetingAddress?: unknown }).meetingAddress === "string" && String((session as { meetingAddress?: string }).meetingAddress).trim()
            ? String((session as { meetingAddress?: string }).meetingAddress).trim()
            : null,
        meetingLatitude:
          typeof (session as { meetingLatitude?: unknown }).meetingLatitude === "number"
            ? ((session as { meetingLatitude?: number }).meetingLatitude as number)
            : null,
        meetingLongitude:
          typeof (session as { meetingLongitude?: unknown }).meetingLongitude === "number"
            ? ((session as { meetingLongitude?: number }).meetingLongitude as number)
            : null,
      })
    }
    return result
  } catch {
    return []
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

function parseItineraryLenient(value: FormDataEntryValue | null): ItineraryInput[] {
  if (typeof value !== "string" || !value.trim()) {
    return []
  }
  try {
    const parsed = JSON.parse(value) as ItineraryInput[]
    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        id: item.id,
        order: Number.parseInt(String(item.order ?? 0), 10) || 0,
        title: typeof item.title === "string" ? item.title : "",
        subtitle: typeof item.subtitle === "string" ? item.subtitle : null,
        imageKey: item.imageKey,
        imageUrl: item.imageUrl,
        duration: typeof item.duration === "string" && item.duration.trim() ? item.duration.trim() : null,
      }))
      .sort((a, b) => a.order - b.order)
  } catch {
    return []
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

function parseRemoveGallery(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return new Set<string>()
  }
  try {
    const parsed = JSON.parse(value) as string[]
    return new Set(parsed.filter((item) => typeof item === "string" && item.length > 0))
  } catch {
    throw new Error("Invalid removeGallery payload")
  }
}

function parseBoolean(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return false
  }
  return value === "true" || value === "1"
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

type SessionInput = {
  id?: string
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
