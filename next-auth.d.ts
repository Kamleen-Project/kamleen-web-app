import { type DefaultSession } from "next-auth"
import { OrganizerStatus, UserRole } from "@/generated/prisma"

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string
      role: UserRole
      activeRole: UserRole
      organizerStatus: OrganizerStatus
    }
  }

  interface User {
    role: UserRole
    activeRole: UserRole
    organizerStatus: OrganizerStatus
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole
    activeRole?: UserRole
    organizerStatus?: OrganizerStatus
  }
}
