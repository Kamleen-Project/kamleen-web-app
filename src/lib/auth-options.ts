import { PrismaAdapter } from "@auth/prisma-adapter"
import type { Adapter } from "next-auth/adapters"
import bcrypt from "bcryptjs"
import type { NextAuthOptions } from "next-auth"
import type { JWT } from "next-auth/jwt"
import type { AccountStatus, OrganizerStatus, UserRole } from "@/generated/prisma"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"

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
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          emailVerified: new Date(),
          accountStatus: "ONBOARDING",
          role: "EXPLORER",
          activeRole: "EXPLORER",
          organizerStatus: "NOT_APPLIED",
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("SignIn callback triggered", { provider: account?.provider, email: user.email })
      if (account?.provider === "google" && user.email) {
        try {
          const email = user.email.toLowerCase()
          const existingUser = await prisma.user.findUnique({
            where: { email },
          })

          console.log("Existing user found:", !!existingUser)

          if (existingUser) {
            const updates: any = {}
            if (!existingUser.emailVerified) {
              updates.emailVerified = new Date()
              console.log("Marking email as verified")
            }
            if (existingUser.accountStatus === "PENDING_VERIFICATION") {
              updates.accountStatus = "ONBOARDING"
              console.log("Updating status to ONBOARDING")
            }

            if (Object.keys(updates).length > 0) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: updates,
              })
              console.log("User updated successfully")
            }
          }
        } catch (error) {
          console.error("Error auto-verifying Google user:", error)
        }
      }
      return true
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role
        token.activeRole = user.activeRole
        token.organizerStatus = user.organizerStatus
          ; (token as JWT & { accountStatus?: AccountStatus }).accountStatus = (user as unknown as { accountStatus?: AccountStatus }).accountStatus
      }

      if (trigger === "update") {
        const s = session as Partial<{
          role: UserRole
          activeRole: UserRole
          organizerStatus: OrganizerStatus
          user?: { role?: UserRole; activeRole?: UserRole; organizerStatus?: OrganizerStatus }
        }> | undefined
        const nextRole = s?.role ?? s?.user?.role
        const nextActiveRole = s?.activeRole ?? s?.user?.activeRole
        const nextOrganizerStatus = s?.organizerStatus ?? s?.user?.organizerStatus
        if (nextRole) {
          token.role = nextRole
        }
        if (nextActiveRole) {
          token.activeRole = nextActiveRole
        }
        if (nextOrganizerStatus) {
          token.organizerStatus = nextOrganizerStatus
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
  events: {
    async linkAccount({ user, account }) {
      if (account.provider === "google") {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              emailVerified: new Date(),
              accountStatus: "ONBOARDING", // Ensure they are not stuck in PENDING_VERIFICATION
            },
          })
        } catch (error) {
          console.error("Error updating user on linkAccount:", error)
        }
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
