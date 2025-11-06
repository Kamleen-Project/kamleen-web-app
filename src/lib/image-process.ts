// Lightweight client-side image processing: resize and compress to WebP/JPEG
// Intended for use from client components only.

export type ImageProcessOptions = {
  maxWidth: number
  maxHeight: number
  mimeType?: "image/webp" | "image/jpeg"
  quality?: number // 0..1
}

export async function processImageFile(input: File, options: ImageProcessOptions): Promise<File> {
  try {
    const { maxWidth, maxHeight, mimeType = "image/webp", quality = 0.82 } = options

    // Read as data URL
    const dataUrl = await readFileAsDataURL(input)

    // Create HTMLImageElement to ensure widest browser support
    const image = await loadImage(dataUrl)

    const { width: srcW, height: srcH } = image
    if (!srcW || !srcH) return input

    const scale = computeScale(srcW, srcH, maxWidth, maxHeight)
    const targetW = Math.max(1, Math.round(srcW * scale))
    const targetH = Math.max(1, Math.round(srcH * scale))

    // Draw onto canvas
    const canvas = document.createElement("canvas")
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext("2d")
    if (!ctx) return input
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(image, 0, 0, targetW, targetH)

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, mimeType, quality))
    if (!blob) return input

    // Prefer keeping original extension semantics in filename
    const fileName = replaceExtension(input.name, mimeType === "image/webp" ? ".webp" : ".jpg")
    return new File([blob], fileName, { type: blob.type })
  } catch {
    return input
  }
}

function computeScale(srcW: number, srcH: number, maxW: number, maxH: number): number {
  const scaleW = maxW > 0 ? maxW / srcW : 1
  const scaleH = maxH > 0 ? maxH / srcH : 1
  const scale = Math.min(1, scaleW, scaleH)
  return isFinite(scale) && scale > 0 ? scale : 1
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function replaceExtension(name: string, newExt: string): string {
  const idx = name.lastIndexOf(".")
  if (idx === -1) return `${name}${newExt}`
  return `${name.slice(0, idx)}${newExt}`
}


