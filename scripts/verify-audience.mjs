import { PrismaClient } from "../src/generated/prisma/index.js"

const prisma = new PrismaClient()

async function main() {
  const slug = `audience-check-${Date.now()}`
  try {
    // We expect this to fail with a foreign key error for organizerId,
    // but only AFTER Prisma accepts the `audience` argument.
    await prisma.experience.create({
      data: {
        organizerId: "nonexistent-organizer-id",
        title: "Audience Check",
        summary: "Testing audience field",
        location: "Nowhere",
        status: "DRAFT",
        price: 0,
        currency: "USD",
        duration: "0 min",
        category: "general",
        audience: "all",
        slug,
      },
      select: { id: true },
    })
    console.log("Audience field accepted and record created (unexpected)")
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.log("Result:", message)
    if (message.includes("Unknown argument `audience`")) {
      process.exitCode = 2
    } else {
      process.exitCode = 0
    }
  } finally {
    await prisma.$disconnect()
  }
}

main()


