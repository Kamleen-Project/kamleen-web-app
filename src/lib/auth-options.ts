import { PrismaAdapter } from "@auth/prisma-adapter"
import type { Adapter } from "next-auth/adapters"
import bcrypt from "bcryptjs"
import type { NextAuthOptions } from "next-auth"
import type { JWT } from "next-auth/jwt"
import type { AccountStatus, OrganizerStatus, UserRole } from "@/generated/prisma"
import CredentialsProvider from "next-auth/providers/credentials"

import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as unknown as Adapter,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        // Hidden field used to scope sign-ins ("admin" vs "user")
        loginScope: { label: "Login Scope", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        })

        if (!user?.hashedPassword) {
          return null
        }

        const isValid = await bcrypt.compare(credentials.password, user.hashedPassword)

        if (!isValid) {
          return null
        }

        // Enforce role-based login scope:
        // - admin scope only allows ADMIN users
        // - user scope only allows non-ADMIN users (EXPLORER/ORGANIZER)
        const loginScope = String((credentials as Record<string, unknown>)?.loginScope ?? "user").toLowerCase()

        if (loginScope === "admin" && user.role !== "ADMIN") {
          return null
        }

        if (loginScope === "user" && user.role === "ADMIN") {
          return null
        }

        // Block banned and archived accounts from signing in
        if (user.accountStatus === "BANNED" || user.accountStatus === "ARCHIVED") {
          return null
        }

        // Derive lifecycle status on login (banned/archived already returned above)
        const now = new Date()
        let derivedStatus = user.accountStatus
        if (!user.emailVerified) {
          derivedStatus = "PENDING_VERIFICATION"
        } else if (!user.onboardingCompletedAt) {
          derivedStatus = "ONBOARDING"
        } else {
          const last = user.lastLoginAt ?? user.createdAt
          const oneYearMs = 365 * 24 * 60 * 60 * 1000
          derivedStatus = now.getTime() - last.getTime() > oneYearMs ? "INACTIVE" : "ACTIVE"
        }

        // If logging in, mark as active (unless banned/archived) and update lastLoginAt
        const nextStatus = derivedStatus === "INACTIVE" ? "ACTIVE" : derivedStatus
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: now, accountStatus: nextStatus },
          })
        } catch {
          // ignore update failure to allow login to proceed
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          activeRole: user.activeRole,
          organizerStatus: user.organizerStatus,
          accountStatus: nextStatus,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role
        token.activeRole = user.activeRole
        token.organizerStatus = user.organizerStatus
        ;(token as JWT & { accountStatus?: AccountStatus }).accountStatus = (user as unknown as { accountStatus?: AccountStatus }).accountStatus
      }

      if (trigger === "update") {
        const sessionData = session as Partial<{ activeRole: UserRole; organizerStatus: OrganizerStatus }> | undefined
        if (sessionData?.activeRole) {
          token.activeRole = sessionData.activeRole
        }
        if (sessionData?.organizerStatus) {
          token.organizerStatus = sessionData.organizerStatus
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? session.user.id
        if (token.role) session.user.role = token.role
        if (token.activeRole) session.user.activeRole = token.activeRole
        if (token.organizerStatus) session.user.organizerStatus = token.organizerStatus
        const t = token as JWT & { accountStatus?: AccountStatus }
        if (t.accountStatus) session.user.accountStatus = t.accountStatus
      }

      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
