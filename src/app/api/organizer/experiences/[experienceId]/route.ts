import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getUserSettingsData } from "@/lib/user-preferences"
import { saveUploadedFile } from "@/lib/uploads"
import { MAX_GALLERY_IMAGES } from "@/config/experiences"
import {
  getRequiredString,
  getOptionalString,
  parseInteger,
  parseTags,
  parseSessions,
  parseSessionsLenient,
  parseItinerary,
  parseItineraryLenient,
  parseOptionalCoordinate,
  parseBoolean,
  getRequiredAudience,
  type SessionInput,
  type ItineraryInput,
} from "@/lib/experience-parse"
import { resolveItineraryStepsFromMeta } from "@/lib/itinerary-upload"
import { isAllowedImageFile } from "@/lib/media"


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
      status: true,
      verificationStatus: true,
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
    const statusParamRaw = getOptionalString(formData, "status")
    const statusParam = statusParamRaw ? statusParamRaw.toUpperCase() : null
    const effectiveStatus = (statusParam ?? experience.status) as "DRAFT" | "PUBLISHED" | "UNPUBLISHED" | "UNLISTED" | "ARCHIVED"
    const isDraft = effectiveStatus === "DRAFT"

    // Block organizer changing status while pending verification
    if (statusParam && experience.verificationStatus === "PENDING" && !isAdmin) {
      return NextResponse.json({ message: "Experience is pending verification; status cannot be changed." }, { status: 409 })
    }

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
      if (!isAllowedImageFile(heroImage)) {
        throw new Error("Unsupported hero image type")
      }
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
      if (updatedGallery.size >= MAX_GALLERY_IMAGES) break
      if (!isAllowedImageFile(entry)) {
        throw new Error("Unsupported gallery image type")
      }
      const stored = await saveUploadedFile({
        file: entry,
        directory: `experiences/${experience.organizerId}/gallery`,
        maxSizeBytes: 10 * 1024 * 1024,
      })
      updatedGallery.add(stored.publicPath)
    }

    const itinerarySteps = await resolveItineraryStepsFromMeta(formData, itineraryMeta, experience.organizerId)

    // allow empty itinerary for drafts; enforce at least one step otherwise
    if (!isDraft) {
      if (!itinerarySteps.length) {
        throw new Error("At least one itinerary step is required")
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
          ...(statusParam ? { status: effectiveStatus } : {}),
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
              meetingAddress: s.meetingAddress ?? null,
              meetingLatitude: s.meetingLatitude ?? null,
              meetingLongitude: s.meetingLongitude ?? null,
            },
          })
        }
      }

      // Upsert itinerary steps by id where available; remove those not present
      const existingSteps = await tx.experienceItineraryStep.findMany({
        where: { experienceId: experience.id },
        select: { id: true },
      })
      const existingIds = new Set(existingSteps.map((s) => s.id))
      const incomingItineraryById = new Map<string, (typeof itineraryMeta)[number]>()
      for (const s of itineraryMeta) {
        if (typeof (s as { id?: unknown }).id === "string") {
          incomingItineraryById.set(((s as { id?: string }).id) as string, s)
        }
      }
      const toDeleteIds = [...existingIds].filter((id) => !incomingItineraryById.has(id))
      if (toDeleteIds.length) {
        await tx.experienceItineraryStep.deleteMany({ where: { id: { in: toDeleteIds } } })
      }
      // Apply updates/creates based on presence of id
      for (const s of itineraryMeta) {
        const target = itinerarySteps.find((t) => t.order === s.order && t.title.trim() === (s.title || "").trim())
        if (!target) continue
        const maybeId = (s as { id?: string }).id
        if (maybeId && existingIds.has(maybeId)) {
          await tx.experienceItineraryStep.update({
            where: { id: maybeId },
            data: {
              order: target.order,
              title: target.title,
              subtitle: target.subtitle,
              image: target.image,
              duration: target.duration,
            },
          })
        } else {
          await tx.experienceItineraryStep.create({
            data: {
              experienceId: experience.id,
              order: target.order,
              title: target.title,
              subtitle: target.subtitle,
              image: target.image,
              duration: target.duration,
            },
          })
        }
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
// Types and helpers moved to shared util
