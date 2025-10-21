import { type DefaultSession } from "next-auth"
import { AccountStatus, OrganizerStatus, UserRole } from "@/generated/prisma"

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string
      role: UserRole
      activeRole: UserRole
      organizerStatus: OrganizerStatus
      accountStatus: AccountStatus
    }
  }

  interface User {
    role: UserRole
    activeRole: UserRole
    organizerStatus: OrganizerStatus
    accountStatus: AccountStatus
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole
    activeRole?: UserRole
    organizerStatus?: OrganizerStatus
    accountStatus?: AccountStatus
  }
}
