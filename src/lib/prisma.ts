import { PrismaClient } from "@/generated/prisma"

const globalForPrisma = globalThis as unknown as {
  prisma_db?: PrismaClient
}

export const prisma = globalForPrisma.prisma_db ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma_db = prisma
}
