// Shared parsing and validation helpers for experience routes

export type SessionInput = {
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

export type ItineraryInput = {
  id?: string
  order: number
  title: string
  subtitle?: string | null
  imageKey?: string
  imageUrl?: string
  duration?: string | null
}

export function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required`)
  }
  return value.trim()
}

export function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function parseInteger(value: string) {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error("Price must be a positive number")
  }
  return parsed
}

export function parseTags(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return [] as string[]
  }
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export function parseSessions(value: FormDataEntryValue | null): SessionInput[] {
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

export function parseSessionsLenient(value: FormDataEntryValue | null): SessionInput[] {
  if (typeof value !== "string") {
    return []
  }
  try {
    const parsed = JSON.parse(value) as Array<Record<string, unknown>>
    const result: SessionInput[] = []
    for (const session of parsed) {
      if (!session || typeof session !== "object") continue
      if (!(session as { startAt?: unknown }).startAt) continue
      const capacity = Number.parseInt(String((session as { capacity?: unknown }).capacity ?? 0), 10)
      if (Number.isNaN(capacity) || capacity <= 0) continue
      result.push({
        id: typeof (session as { id?: unknown }).id === "string" ? ((session as { id?: string }).id as string) : undefined,
        startAt: String((session as { startAt: unknown }).startAt),
        duration:
          typeof (session as { duration?: unknown }).duration === "string" && String((session as { duration?: string }).duration).trim()
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

export function parseItinerary(value: FormDataEntryValue | null): ItineraryInput[] {
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

export function parseItineraryLenient(value: FormDataEntryValue | null): ItineraryInput[] {
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

export function parseOptionalCoordinate(value: FormDataEntryValue | null, _key: string) {
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

export function getRequiredAudience(formData: FormData) {
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

export function parseBoolean(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return false
  }
  return value === "true" || value === "1"
}


