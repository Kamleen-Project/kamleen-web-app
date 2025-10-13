import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveUploadedFile } from "@/lib/uploads"

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

export async function PATCH(request: Request, { params }: { params: Promise<{ countryId: string }> }) {
  const session = await getServerAuthSession()

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const contentType = request.headers.get("content-type") ?? ""

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData()

    try {
      const data: Record<string, unknown> = {}

      const name = getOptionalString(formData, "name")
      if (name) {
        data.name = name
      }

      const subtitle = getOptionalString(formData, "subtitle")
      if (subtitle !== null) {
        data.subtitle = subtitle
      }

      const latitude = parseCoordinate(formData.get("latitude"))
      if (latitude !== undefined) {
        if (latitude === null) throw new Error("Invalid latitude")
        data.latitude = latitude
      }

      const longitude = parseCoordinate(formData.get("longitude"))
      if (longitude !== undefined) {
        if (longitude === null) throw new Error("Invalid longitude")
        data.longitude = longitude
      }

      const pictureFile = formData.get("picture")
      if (pictureFile instanceof File && pictureFile.size > 0) {
        const stored = await saveUploadedFile({
          file: pictureFile,
          directory: "countries",
          maxSizeBytes: 5 * 1024 * 1024,
        })
        data.picture = stored.publicPath
      }

      if (!Object.keys(data).length) {
        return NextResponse.json({ ok: true })
      }

      const { countryId } = await params
      const country = await prisma.country.update({
        where: { id: countryId },
        data,
      })

      return NextResponse.json({ ok: true, country })
    } catch (error) {
      if (error instanceof Error) {
        if ("code" in error && (error as { code: string }).code === "P2002") {
          return NextResponse.json({ message: "A country with this name already exists" }, { status: 409 })
        }
        return NextResponse.json({ message: error.message }, { status: 400 })
      }
      console.error("Failed to update country", error)
      return NextResponse.json({ message: "Failed to update country" }, { status: 500 })
    }
  }

  const body = await request.json().catch(() => null)

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 })
  }

  const name = normalizeString((body as Record<string, unknown>).name)
  const subtitle = normalizeNullableString((body as Record<string, unknown>).subtitle)
  const picture = normalizeNullableString((body as Record<string, unknown>).picture)
  const latitude = parseCoordinate((body as Record<string, unknown>).latitude)
  const longitude = parseCoordinate((body as Record<string, unknown>).longitude)

  const data: Record<string, unknown> = {}

  if (name !== null) {
    data.name = name
  }

  if (subtitle !== undefined) {
    data.subtitle = subtitle ?? null
  }

  if (picture !== undefined) {
    data.picture = picture ?? null
  }

  if (latitude !== undefined) {
    if (latitude === null) {
      return NextResponse.json({ message: "Invalid latitude" }, { status: 400 })
    }
    data.latitude = latitude
  }

  if (longitude !== undefined) {
    if (longitude === null) {
      return NextResponse.json({ message: "Invalid longitude" }, { status: 400 })
    }
    data.longitude = longitude
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ ok: true })
  }

  try {
    const { countryId } = await params
    const country = await prisma.country.update({
      where: { id: countryId },
      data,
    })

    return NextResponse.json({ ok: true, country })
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      const code = (error as { code: string }).code
      if (code === "P2025") {
        return NextResponse.json({ message: "Country not found" }, { status: 404 })
      }
      if (code === "P2002") {
        return NextResponse.json({ message: "A country with this name already exists" }, { status: 409 })
      }
    }

    console.error("Failed to update country", error)
    return NextResponse.json({ message: "Failed to update country" }, { status: 500 })
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

export async function DELETE(request: Request, { params }: { params: Promise<{ countryId: string }> }) {
  const session = await getServerAuthSession()

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const searchParams = new URL(request.url).searchParams
  const force = searchParams.get("force") === "true"

  try {
    const { countryId } = await params
    if (force) {
      await prisma.$transaction(async (tx) => {
        await tx.experience.updateMany({
          where: { countryId },
          data: { countryId: null, stateId: null, cityId: null },
        })
        await tx.country.delete({ where: { id: countryId } })
      })
    } else {
      const existing = await prisma.country.findUnique({
        where: { id: countryId },
        select: {
          _count: {
            select: {
              states: true,
              cities: true,
              experiences: true,
            },
          },
        },
      })

      if (!existing) {
        return NextResponse.json({ message: "Country not found" }, { status: 404 })
      }

      const { states, cities, experiences } = existing._count
      if (states > 0 || cities > 0 || experiences > 0) {
        return NextResponse.json(
          {
            message: "Country is in use. Pass force=true to delete and detach related records.",
            stateCount: states,
            cityCount: cities,
            experienceCount: experiences,
          },
          { status: 409 },
        )
      }

      await prisma.country.delete({ where: { id: countryId } })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code: string }).code === "P2025") {
      return NextResponse.json({ message: "Country not found" }, { status: 404 })
    }

    console.error("Failed to delete country", error)
    return NextResponse.json({ message: "Failed to delete country" }, { status: 500 })
  }
}

