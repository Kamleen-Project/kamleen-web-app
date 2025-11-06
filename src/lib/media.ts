export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function isAllowedImageFile(file: File) {
  if (!(file instanceof File)) return false;
  const type = (file as File).type || "";
  if (ALLOWED_IMAGE_MIME_TYPES.has(type)) return true;
  // Some automated uploads (e.g. Playwright/Robot) may not populate MIME type.
  // Fall back to validating by file extension when type is missing/unknown.
  const name = (file as File).name || "";
  const lower = name.toLowerCase();
  return lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp");
}


