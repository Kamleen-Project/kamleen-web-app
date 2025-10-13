import { PrismaClient } from "../src/generated/prisma/index.js"

const prisma = new PrismaClient()

function slugify(input) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

async function main() {
  const email = "organizer.demo@together.dev"

  const organizer = await prisma.user.upsert({
    where: { email },
    update: {
      name: "Demo Organizer",
      role: "ORGANIZER",
      activeRole: "ORGANIZER",
      organizerStatus: "APPROVED",
      headline: "Curator of sensory experiences",
    },
    create: {
      email,
      name: "Demo Organizer",
      role: "ORGANIZER",
      activeRole: "ORGANIZER",
      organizerStatus: "APPROVED",
      headline: "Curator of sensory experiences",
      bio: "Bringing people together through food, music, and storytelling across the city skyline.",
    },
  })

  const title = "Skyline Sound Bath & Supper Club"
  const summary = "Unwind atop the city with a guided sound bath followed by a seasonal tasting menu under the stars."
  const description =
    "Ease into the evening with a restorative sound bath, then settle into a communal table for a five-course tasting menu inspired by the seasons. Expect live instrumentation, curated mocktails, and time to connect with fellow explorers."
  const location = "Brooklyn, New York"
  const duration = "3 hours"
  const tags = ["wellness", "culinary", "rooftop"]
  const price = 145
  const currency = "USD"
  const heroImage = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80"
  const galleryImages = [
    "https://images.unsplash.com/photo-1524763036624-09c21c70bedd?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1527169402691-feff5539e52c?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1520201163981-8cc95007dd2a?auto=format&fit=crop&w=1600&q=80",
  ]

  const baseSlug = slugify(title) || "experience"
  let slug = baseSlug
  let suffix = 1
  while (await prisma.experience.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }

  const now = new Date()
  const sessionOneStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 19, 0)
  const sessionTwoStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14, 19, 0)

  const experience = await prisma.experience.create({
    data: {
      organizerId: organizer.id,
      title,
      summary,
      description,
      location,
      duration,
      tags,
      price,
      currency,
      heroImage,
      galleryImages,
      slug,
      sessions: {
        create: [
          {
            startAt: sessionOneStart,
            endAt: new Date(sessionOneStart.getTime() + 2.5 * 60 * 60 * 1000),
            capacity: 18,
            priceOverride: null,
          },
          {
            startAt: sessionTwoStart,
            endAt: new Date(sessionTwoStart.getTime() + 2.5 * 60 * 60 * 1000),
            capacity: 18,
            priceOverride: 160,
          },
        ],
      },
    },
  })

  console.log(`Created experience with slug: ${experience.slug}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
