import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveUploadedFile } from "@/lib/uploads"

type CountryPayload = {
  name: string
  subtitle?: string | null
  picture: string
  latitude: number
  longitude: number
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

function parseCountryPayload(body: unknown): CountryPayload | null {
  if (!body || typeof body !== "object") return null
  const payload = body as Record<string, unknown>

  const name = normalizeString(payload.name)
  const subtitle = normalizeNullableString(payload.subtitle)
  const picture = normalizeString(payload.picture)
  const latitude = parseLatitude(payload.latitude)
  const longitude = parseLongitude(payload.longitude)

  if (!name || !picture || latitude === null || longitude === null) {
    return null
  }

  return {
    name,
    subtitle: subtitle ?? null,
    picture,
    latitude,
    longitude,
  }
}

export async function GET() {
  const session = await getServerAuthSession()

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const countries = await prisma.country.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          states: true,
          cities: true,
          experiences: true,
        },
      },
    },
  })

  const payload = countries.map((country) => ({
    id: country.id,
    name: country.name,
    subtitle: country.subtitle,
    picture: country.picture,
    latitude: country.latitude,
    longitude: country.longitude,
    stats: {
      stateCount: country._count.states,
      cityCount: country._count.cities,
      experienceCount: country._count.experiences,
    },
    createdAt: country.createdAt,
    updatedAt: country.updatedAt,
  }))

  return NextResponse.json({ countries: payload })
}

export async function POST(request: Request) {
  const session = await getServerAuthSession()

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const contentType = request.headers.get("content-type") ?? ""

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData()

    try {
      const name = getRequiredString(formData, "name")
      const subtitle = getOptionalString(formData, "subtitle")
      const latitude = parseLatitude(formData.get("latitude"))
      const longitude = parseLongitude(formData.get("longitude"))

      if (latitude === null || longitude === null) {
        throw new Error("Latitude and longitude are required")
      }

      const pictureFile = formData.get("picture")
      if (!(pictureFile instanceof File) || pictureFile.size === 0) {
        throw new Error("Country image is required")
      }

      const stored = await saveUploadedFile({
        file: pictureFile,
        directory: "countries",
        maxSizeBytes: 5 * 1024 * 1024,
      })

      const country = await prisma.country.create({
        data: {
          name,
          subtitle,
          picture: stored.publicPath,
          latitude,
          longitude,
        },
      })

      return NextResponse.json({ ok: true, country })
    } catch (error) {
      if (error instanceof Error) {
        if ("code" in error && (error as { code: string }).code === "P2002") {
          return NextResponse.json({ message: "A country with this name already exists" }, { status: 409 })
        }
        return NextResponse.json({ message: error.message }, { status: 400 })
      }
      console.error("Failed to create country", error)
      return NextResponse.json({ message: "Failed to create country" }, { status: 500 })
    }
  }

  const body = await request.json().catch(() => null)
  const payload = parseCountryPayload(body)

  if (!payload) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 })
  }

  try {
    const country = await prisma.country.create({
      data: {
        name: payload.name,
        subtitle: payload.subtitle,
        picture: payload.picture,
        latitude: payload.latitude,
        longitude: payload.longitude,
      },
    })

    return NextResponse.json({ ok: true, country })
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ message: "A country with this name already exists" }, { status: 409 })
    }

    console.error("Failed to create country", error)
    return NextResponse.json({ message: "Failed to create country" }, { status: 500 })
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

