import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveUploadedFile } from "@/lib/uploads"

type StatePayload = {
  name: string
  subtitle?: string | null
  picture?: string | null
  latitude?: number | null
  longitude?: number | null
  countryId: string
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

function parseCoordinate(value: unknown) {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== "string" && typeof value !== "number") return null
  const parsed = typeof value === "number" ? value : Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return null
  return parsed
}

function parseStatePayload(body: unknown): StatePayload | null {
  if (!body || typeof body !== "object") return null
  const payload = body as Record<string, unknown>

  const name = normalizeString(payload.name)
  const subtitle = normalizeNullableString(payload.subtitle)
  const picture = normalizeNullableString(payload.picture)
  const latitude = parseCoordinate(payload.latitude)
  const longitude = parseCoordinate(payload.longitude)
  const countryId = normalizeString(payload.countryId)

  if (!name || !countryId) {
    return null
  }

  return {
    name,
    subtitle: subtitle ?? null,
    picture: picture ?? null,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    countryId,
  }
}

export async function GET(request: Request) {
  const session = await getServerAuthSession()

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const searchParams = new URL(request.url).searchParams
  const countryId = searchParams.get("countryId") ?? undefined

  const states = await prisma.state.findMany({
    where: countryId ? { countryId } : undefined,
    orderBy: [{ country: { name: "asc" } }, { name: "asc" }],
    include: {
      country: {
        select: { id: true, name: true },
      },
      _count: {
        select: {
          cities: true,
          experiences: true,
        },
      },
    },
  })

  const payload = states.map((state) => ({
    id: state.id,
    name: state.name,
    subtitle: state.subtitle,
    picture: state.picture,
    latitude: state.latitude,
    longitude: state.longitude,
    country: state.country,
    stats: {
      cityCount: state._count.cities,
      experienceCount: state._count.experiences,
    },
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
  }))

  return NextResponse.json({ states: payload })
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
      const countryId = getRequiredString(formData, "countryId")
      const latitude = parseLatitude(formData.get("latitude"))
      const longitude = parseLongitude(formData.get("longitude"))

      const country = await prisma.country.findUnique({ where: { id: countryId }, select: { id: true } })
      if (!country) {
        return NextResponse.json({ message: "Country not found" }, { status: 404 })
      }

      const pictureFile = formData.get("picture")
      let picture: string | null = null
      if (pictureFile instanceof File && pictureFile.size > 0) {
        const stored = await saveUploadedFile({
          file: pictureFile,
          directory: "states",
          maxSizeBytes: 5 * 1024 * 1024,
        })
        picture = stored.publicPath
      }

      const state = await prisma.state.create({
        data: {
          name,
          subtitle,
          picture,
          latitude,
          longitude,
          countryId,
        },
      })

      return NextResponse.json({ ok: true, state })
    } catch (error) {
      if (error instanceof Error) {
        if ("code" in error && (error as { code: string }).code === "P2002") {
          return NextResponse.json({ message: "A state with this name already exists for the selected country" }, { status: 409 })
        }
        return NextResponse.json({ message: error.message }, { status: 400 })
      }
      console.error("Failed to create state", error)
      return NextResponse.json({ message: "Failed to create state" }, { status: 500 })
    }
  }

  const body = await request.json().catch(() => null)
  const payload = parseStatePayload(body)

  if (!payload) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 })
  }

  const country = await prisma.country.findUnique({ where: { id: payload.countryId }, select: { id: true } })
  if (!country) {
    return NextResponse.json({ message: "Country not found" }, { status: 404 })
  }

  try {
    const state = await prisma.state.create({
      data: {
        name: payload.name,
        subtitle: payload.subtitle,
        picture: payload.picture,
        latitude: payload.latitude,
        longitude: payload.longitude,
        countryId: payload.countryId,
      },
    })

    return NextResponse.json({ ok: true, state })
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ message: "A state with this name already exists for the selected country" }, { status: 409 })
    }

    console.error("Failed to create state", error)
    return NextResponse.json({ message: "Failed to create state" }, { status: 500 })
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

function parseLatitude(value: FormDataEntryValue | null) {
  if (value === null) return null
  if (typeof value !== "string") return null
  if (!value.trim()) return null
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid latitude")
  }
  return parsed
}

function parseLongitude(value: FormDataEntryValue | null) {
  if (value === null) return null
  if (typeof value !== "string") return null
  if (!value.trim()) return null
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid longitude")
  }
  return parsed
}

