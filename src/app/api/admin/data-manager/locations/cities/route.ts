import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type CityPayload = {
  name: string
  subtitle?: string | null
  picture: string
  latitude: number
  longitude: number
  countryId: string
  stateId?: string | null
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeNullableString(value: unknown) {
  if (value === undefined) return undefined
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parseLatitude(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") return null
  const parsed = typeof value === "number" ? value : Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return null
  if (parsed < -90 || parsed > 90) return null
  return parsed
}

function parseLongitude(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") return null
  const parsed = typeof value === "number" ? value : Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return null
  if (parsed < -180 || parsed > 180) return null
  return parsed
}

function parseCityPayload(body: unknown): CityPayload | null {
  if (!body || typeof body !== "object") return null
  const payload = body as Record<string, unknown>

  const name = normalizeString(payload.name)
  const subtitle = normalizeNullableString(payload.subtitle)
  const picture = normalizeString(payload.picture)
  const latitude = parseLatitude(payload.latitude)
  const longitude = parseLongitude(payload.longitude)
  const countryId = normalizeString(payload.countryId)
  const stateId = normalizeNullableString(payload.stateId)

  if (!name || !picture || latitude === null || longitude === null || !countryId) {
    return null
  }

  return {
    name,
    subtitle: subtitle ?? null,
    picture,
    latitude,
    longitude,
    countryId,
    stateId: stateId ?? null,
  }
}

export async function GET(request: Request) {
  const session = await getServerAuthSession()

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const searchParams = new URL(request.url).searchParams
  const countryId = searchParams.get("countryId") ?? undefined
  const stateId = searchParams.get("stateId") ?? undefined

  const where = {
    ...(countryId ? { countryId } : {}),
    ...(stateId ? { stateId } : {}),
  }

  const cities = await prisma.city.findMany({
    where: Object.keys(where).length ? where : undefined,
    orderBy: [{ country: { name: "asc" } }, { name: "asc" }],
    include: {
      country: { select: { id: true, name: true } },
      state: { select: { id: true, name: true } },
      _count: {
        select: {
          experiences: true,
        },
      },
    },
  })

  const payload = cities.map((city) => ({
    id: city.id,
    name: city.name,
    subtitle: city.subtitle,
    picture: city.picture,
    latitude: city.latitude,
    longitude: city.longitude,
    country: city.country,
    state: city.state,
    stats: {
      experienceCount: city._count.experiences,
    },
    createdAt: city.createdAt,
    updatedAt: city.updatedAt,
  }))

  return NextResponse.json({ cities: payload })
}

export async function POST(request: Request) {
  const session = await getServerAuthSession()

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const payload = parseCityPayload(body)

  if (!payload) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 })
  }

  const country = await prisma.country.findUnique({ where: { id: payload.countryId }, select: { id: true } })
  if (!country) {
    return NextResponse.json({ message: "Country not found" }, { status: 404 })
  }

  if (payload.stateId) {
    const state = await prisma.state.findUnique({ where: { id: payload.stateId }, select: { id: true, countryId: true } })
    if (!state || state.countryId !== payload.countryId) {
      return NextResponse.json({ message: "State not found in selected country" }, { status: 400 })
    }
  }

  try {
    const city = await prisma.city.create({
      data: {
        name: payload.name,
        subtitle: payload.subtitle,
        picture: payload.picture,
        latitude: payload.latitude,
        longitude: payload.longitude,
        countryId: payload.countryId,
        stateId: payload.stateId,
      },
    })

    return NextResponse.json({ ok: true, city })
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ message: "A city with this name already exists for the selected country/state" }, { status: 409 })
    }

    console.error("Failed to create city", error)
    return NextResponse.json({ message: "Failed to create city" }, { status: 500 })
  }
}

