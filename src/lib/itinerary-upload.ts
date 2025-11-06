import { saveUploadedFile } from "@/lib/uploads";
import type { ItineraryInput } from "@/lib/experience-parse";
import { isAllowedImageFile } from "@/lib/media";

export type PersistedItineraryStep = {
  order: number;
  title: string;
  subtitle: string | null;
  image: string;
  duration: string | null;
};

export async function resolveItineraryStepsFromMeta(
  formData: FormData,
  itineraryMeta: ItineraryInput[],
  organizerId: string
): Promise<PersistedItineraryStep[]> {
  const steps: PersistedItineraryStep[] = [];

  for (const step of itineraryMeta) {
    const titleValue = (step.title || "").trim();
    if (!titleValue) continue;

    let imagePath: string | null = null;
    if (step.imageKey) {
      const file = formData.get(step.imageKey);
      if (!(file instanceof File) || file.size === 0) {
        throw new Error(`Image upload missing for itinerary step "${titleValue}"`);
      }
      if (!isAllowedImageFile(file)) {
        throw new Error(`Unsupported image type for itinerary step "${titleValue}"`);
      }
      const stored = await saveUploadedFile({
        file,
        directory: `experiences/${organizerId}/itinerary`,
        maxSizeBytes: 10 * 1024 * 1024,
      });
      imagePath = stored.publicPath;
    } else if (step.imageUrl) {
      imagePath = step.imageUrl;
    }

    steps.push({
      order: step.order,
      title: titleValue,
      subtitle: step.subtitle?.trim() || null,
      image: imagePath ?? "",
      duration: typeof step.duration === "string" && step.duration.trim() ? step.duration.trim() : null,
    });
  }

  return steps;
}


