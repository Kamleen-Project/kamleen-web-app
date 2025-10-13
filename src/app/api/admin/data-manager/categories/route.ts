import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveUploadedFile } from "@/lib/uploads"

function normalizeString(value: unknown) {
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

export async function GET() {
  const session = await getServerAuthSession()

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const categories = await prisma.experienceCategory.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          experiences: true,
        },
      },
    },
  })

  return NextResponse.json({
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      subtitle: category.subtitle,
      picture: category.picture,
      experienceCount: category._count.experiences,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    })),
  })
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
      const subtitle = getRequiredString(formData, "subtitle")

      const pictureFile = formData.get("picture")
      if (!(pictureFile instanceof File) || pictureFile.size === 0) {
        throw new Error("Category image is required")
      }

      const stored = await saveUploadedFile({
        file: pictureFile,
        directory: "categories",
        maxSizeBytes: 5 * 1024 * 1024,
      })

      const category = await prisma.experienceCategory.create({
        data: {
          name,
          subtitle,
          picture: stored.publicPath,
        },
      })

      return NextResponse.json({
        ok: true,
        category,
      })
    } catch (error) {
      if (error instanceof Error) {
        if ("code" in error && (error as { code: string }).code === "P2002") {
          return NextResponse.json({ message: "A category with this name already exists" }, { status: 409 })
        }
        return NextResponse.json({ message: error.message }, { status: 400 })
      }
      console.error("Failed to create experience category", error)
      return NextResponse.json({ message: "Failed to create experience category" }, { status: 500 })
    }
  }

  const body = await request.json().catch(() => null)

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 })
  }

  const name = normalizeString((body as Record<string, unknown>).name)
  const subtitle = normalizeString((body as Record<string, unknown>).subtitle)
  const picture = normalizeString((body as Record<string, unknown>).picture)

  if (!name) {
    return NextResponse.json({ message: "Name is required" }, { status: 400 })
  }

  if (!subtitle) {
    return NextResponse.json({ message: "Subtitle is required" }, { status: 400 })
  }

  if (!picture) {
    return NextResponse.json({ message: "Picture URL is required" }, { status: 400 })
  }

  try {
    const category = await prisma.experienceCategory.create({
      data: {
        name,
        subtitle,
        picture,
      },
    })

    return NextResponse.json({
      ok: true,
      category,
    })
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ message: "A category with this name already exists" }, { status: 409 })
    }

    console.error("Failed to create experience category", error)
    return NextResponse.json({ message: "Failed to create experience category" }, { status: 500 })
  }
}

