import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { saveUploadedFile } from "@/lib/uploads"

function resolveDirectory(base: string, folder: string | null): string {
  const normalized = (folder || "").toLowerCase().trim()
  switch (normalized) {
    case "hero":
      return `${base}`
    case "gallery":
      return `${base}/gallery`
    case "itinerary":
      return `${base}/itinerary`
    default:
      return `${base}/misc`
  }
}

export async function POST(request: Request) {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  if (session.user.activeRole !== "ORGANIZER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Only organizers can upload" }, { status: 403 })
  }

  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ message: "Unsupported content type" }, { status: 400 })
  }

  const formData = await request.formData()
  const file = formData.get("file")
  const folder = (formData.get("folder") as string) || null

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ message: "Missing file" }, { status: 400 })
  }

  try {
    const organizerBase = `experiences/${session.user.id}`
    const directory = resolveDirectory(organizerBase, folder)
    const stored = await saveUploadedFile({ file, directory, maxSizeBytes: 10 * 1024 * 1024 })
    return NextResponse.json({ url: stored.publicPath }, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }
    return NextResponse.json({ message: "Unable to upload file" }, { status: 500 })
  }
}


