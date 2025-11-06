import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"
import { put } from "@vercel/blob"

type SaveFileOptions = {
  file: File
  directory?: string
  maxSizeBytes?: number
  allowedMimeTypes?: string[]
}

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024 // 5MB
const DEFAULT_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

export async function saveUploadedFile({
  file,
  directory = "avatars",
  maxSizeBytes = DEFAULT_MAX_SIZE,
  allowedMimeTypes = DEFAULT_ALLOWED_MIME_TYPES,
}: SaveFileOptions) {
  if (file.size === 0) {
    throw new Error("File is empty")
  }

  if (file.size > maxSizeBytes) {
    throw new Error("File exceeds size limit")
  }

  if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.type)) {
    throw new Error("Unsupported file type")
  }

  const extension = determineExtension(file)
  const fileName = `${randomUUID()}${extension}`
  const key = `${directory.replace(/^\/+|\/+$/g, "")}/${fileName}`

  // Use Vercel Blob in production (or when a Blob token is available), otherwise fall back to local FS for dev
  const shouldUseVercelBlob = process.env.VERCEL === "1" || Boolean(process.env.BLOB_READ_WRITE_TOKEN)

  const buffer = Buffer.from(await file.arrayBuffer())

  if (shouldUseVercelBlob) {
    const uploaded = await put(key, buffer, {
      access: "public",
      contentType: file.type || "application/octet-stream",
    })
    return {
      filePath: uploaded.url,
      publicPath: uploaded.url,
    }
  }

  const uploadRoot = path.join(process.cwd(), "public", "uploads")
  const targetDir = path.join(uploadRoot, directory)
  await fs.mkdir(targetDir, { recursive: true })
  const filePath = path.join(targetDir, fileName)
  await fs.writeFile(filePath, buffer)
  return { filePath, publicPath: `/uploads/${directory}/${fileName}` }
}

function determineExtension(file: File) {
  const existingExtension = extractExtension(file.name)
  if (existingExtension) {
    return existingExtension
  }

  const inferredExtension = inferExtensionFromMime(file.type)
  return inferredExtension ?? ""
}

function extractExtension(filename: string) {
  const ext = path.extname(filename)
  return ext
}

function inferExtensionFromMime(mime: string) {
  switch (mime) {
    case "image/jpeg":
      return ".jpg"
    case "image/png":
      return ".png"
    case "image/webp":
      return ".webp"
    case "image/gif":
      return ".gif"
    default:
      return null
  }
}
