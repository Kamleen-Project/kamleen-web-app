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

export async function PATCH(request: Request, { params }: { params: Promise<{ categoryId: string }> }) {
  const session = await getServerAuthSession()

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const contentType = request.headers.get("content-type") ?? ""

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData()

    try {
      const data: Record<string, string | null> = {}

      const name = getOptionalString(formData, "name")
      if (name) {
        data.name = name
      }

      const subtitle = getOptionalString(formData, "subtitle")
      if (subtitle !== null) {
        data.subtitle = subtitle
      }

      const pictureFile = formData.get("picture")
      if (pictureFile instanceof File && pictureFile.size > 0) {
        const stored = await saveUploadedFile({
          file: pictureFile,
          directory: "categories",
          maxSizeBytes: 5 * 1024 * 1024,
        })
        data.picture = stored.publicPath
      }

      if (!Object.keys(data).length) {
        return NextResponse.json({ ok: true })
      }

      const { categoryId } = await params
      const category = await prisma.experienceCategory.update({
        where: { id: categoryId },
        data,
      })

      return NextResponse.json({ ok: true, category })
    } catch (error) {
      if (error instanceof Error) {
        if ("code" in error && (error as { code: string }).code === "P2002") {
          return NextResponse.json({ message: "A category with this name already exists" }, { status: 409 })
        }
        return NextResponse.json({ message: error.message }, { status: 400 })
      }
      console.error("Failed to update experience category", error)
      return NextResponse.json({ message: "Failed to update experience category" }, { status: 500 })
    }
  }

  const body = await request.json().catch(() => null)

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 })
  }

  const name = normalizeString((body as Record<string, unknown>).name)
  const subtitle = normalizeNullableString((body as Record<string, unknown>).subtitle)
  const picture = normalizeNullableString((body as Record<string, unknown>).picture)

  const data: Record<string, string | null> = {}

  if (name !== null) {
    data.name = name
  }

  if (subtitle !== undefined) {
    data.subtitle = subtitle ?? null
  }

  if (picture !== undefined) {
    data.picture = picture ?? null
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ ok: true })
  }

  try {
    const { categoryId } = await params
    const category = await prisma.experienceCategory.update({
      where: { id: categoryId },
      data,
    })

    return NextResponse.json({ ok: true, category })
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code: string }).code === "P2025") {
      return NextResponse.json({ message: "Category not found" }, { status: 404 })
    }

    if (error instanceof Error && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ message: "A category with this name already exists" }, { status: 409 })
    }

    console.error("Failed to update experience category", error)
    return NextResponse.json({ message: "Failed to update experience category" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ categoryId: string }> }) {
  const session = await getServerAuthSession()

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const searchParams = new URL(request.url).searchParams
  const force = searchParams.get("force") === "true"

  try {
    const { categoryId } = await params
    if (force) {
      await prisma.$transaction(async (tx) => {
        await tx.experience.updateMany({
          where: { categoryId },
          data: { categoryId: null },
        })
        await tx.experienceCategory.delete({ where: { id: categoryId } })
      })
    } else {
      const experiences = await prisma.experience.count({ where: { categoryId } })
      if (experiences > 0) {
        return NextResponse.json(
          {
            message: "Category is in use. Pass force=true to remove and detach experiences.",
            experienceCount: experiences,
          },
          { status: 409 },
        )
      }
      await prisma.experienceCategory.delete({ where: { id: categoryId } })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code: string }).code === "P2025") {
      return NextResponse.json({ message: "Category not found" }, { status: 404 })
    }

    console.error("Failed to delete experience category", error)
    return NextResponse.json({ message: "Failed to delete experience category" }, { status: 500 })
  }
}

