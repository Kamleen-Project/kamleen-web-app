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

export async function PATCH(request: Request, { params }: { params: Promise<{ stateId: string }> }) {
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
      if (name) data.name = name

      const subtitle = getOptionalString(formData, "subtitle")
      if (subtitle !== null) data.subtitle = subtitle

      const latitude = parseCoordinate(formData.get("latitude"))
      if (latitude !== undefined) data.latitude = latitude === null ? null : latitude

      const longitude = parseCoordinate(formData.get("longitude"))
      if (longitude !== undefined) data.longitude = longitude === null ? null : longitude

      const countryId = getOptionalString(formData, "countryId")
      if (countryId !== null) {
        if (!countryId) {
          return NextResponse.json({ message: "countryId must be a non-empty string" }, { status: 400 })
        }
        const exists = await prisma.country.findUnique({ where: { id: countryId }, select: { id: true } })
        if (!exists) {
          return NextResponse.json({ message: "Country not found" }, { status: 404 })
        }
        data.countryId = countryId
      }

      const pictureFile = formData.get("picture")
      if (pictureFile instanceof File && pictureFile.size > 0) {
        const stored = await saveUploadedFile({ file: pictureFile, directory: "states", maxSizeBytes: 5 * 1024 * 1024 })
        data.picture = stored.publicPath
      }

      if (!Object.keys(data).length) {
        return NextResponse.json({ ok: true })
      }

      const { stateId } = await params
      if (data.countryId) {
        await prisma.city.updateMany({ where: { stateId, countryId: { not: data.countryId as string } }, data: { countryId: data.countryId as string } })
      }

      const state = await prisma.state.update({ where: { id: stateId }, data })
      return NextResponse.json({ ok: true, state })
    } catch (error) {
      if (error instanceof Error && "code" in error) {
        const prismaError = error as { code: string }
        if (prismaError.code === "P2025") {
          return NextResponse.json({ message: "State not found" }, { status: 404 })
        }
        if (prismaError.code === "P2002") {
          return NextResponse.json({ message: "A state with this name already exists for the selected country" }, { status: 409 })
        }
      }
      console.error("Failed to update state", error)
      return NextResponse.json({ message: "Failed to update state" }, { status: 500 })
    }
  }

  const body = await request.json().catch(() => null)

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  const payload = body as Record<string, unknown>

  const name = normalizeString(payload.name)
  if (name) {
    data.name = name
  }

  const subtitle = normalizeNullableString(payload.subtitle)
  if (subtitle !== undefined) {
    data.subtitle = subtitle ?? null
  }

  const picture = normalizeNullableString(payload.picture)
  if (picture !== undefined) {
    data.picture = picture ?? null
  }

  const latitude = parseCoordinate(payload.latitude)
  if (latitude !== undefined) {
    if (latitude === null) {
      data.latitude = null
    } else {
      data.latitude = latitude
    }
  }

  const longitude = parseCoordinate(payload.longitude)
  if (longitude !== undefined) {
    if (longitude === null) {
      data.longitude = null
    } else {
      data.longitude = longitude
    }
  }

  const countryId = normalizeNullableString(payload.countryId)
  if (countryId !== undefined) {
    if (!countryId) {
      return NextResponse.json({ message: "countryId must be a non-empty string" }, { status: 400 })
    }
    const exists = await prisma.country.findUnique({ where: { id: countryId }, select: { id: true } })
    if (!exists) {
      return NextResponse.json({ message: "Country not found" }, { status: 404 })
    }
    data.countryId = countryId

    // Ensure cities remain scoped correctly when the country changes.
    const { stateId } = await params
    await prisma.city.updateMany({
      where: { stateId, countryId: { not: countryId } },
      data: { countryId },
    })
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ ok: true })
  }

  try {
    const { stateId } = await params
    const state = await prisma.state.update({
      where: { id: stateId },
      data,
    })

    return NextResponse.json({ ok: true, state })
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      const prismaError = error as { code: string }
      if (prismaError.code === "P2025") {
        return NextResponse.json({ message: "State not found" }, { status: 404 })
      }
      if (prismaError.code === "P2002") {
        return NextResponse.json({ message: "A state with this name already exists for the selected country" }, { status: 409 })
      }
    }

    console.error("Failed to update state", error)
    return NextResponse.json({ message: "Failed to update state" }, { status: 500 })
  }
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function DELETE(request: Request, { params }: { params: Promise<{ stateId: string }> }) {
  const session = await getServerAuthSession()

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const searchParams = new URL(request.url).searchParams
  const force = searchParams.get("force") === "true"

  try {
    const { stateId } = await params
    if (force) {
      await prisma.$transaction(async (tx) => {
        await tx.city.updateMany({ where: { stateId }, data: { stateId: null } })
        await tx.experience.updateMany({ where: { stateId }, data: { stateId: null } })
        await tx.state.delete({ where: { id: stateId } })
      })
    } else {
      const [cityCount, experienceCount] = await Promise.all([
        prisma.city.count({ where: { stateId } }),
        prisma.experience.count({ where: { stateId } }),
      ])

      if (cityCount > 0 || experienceCount > 0) {
        return NextResponse.json(
          {
            message: "State is in use. Pass force=true to remove and detach cities/experiences.",
            cityCount,
            experienceCount,
          },
          { status: 409 },
        )
      }

      await prisma.state.delete({ where: { id: stateId } })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code: string }).code === "P2025") {
      return NextResponse.json({ message: "State not found" }, { status: 404 })
    }

    console.error("Failed to delete state", error)
    return NextResponse.json({ message: "Failed to delete state" }, { status: 500 })
  }
}

