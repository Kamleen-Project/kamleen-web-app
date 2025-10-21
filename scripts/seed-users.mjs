import { PrismaClient, OrganizerStatus, UserRole, AccountStatus } from "../src/generated/prisma/index.js"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function upsertUser({
  email,
  name,
  role,
  activeRole,
  password,
  organizerStatus,
  headline,
  bio,
  location,
  image,
  website,
  phone,
  preferredLanguage,
  preferredCurrency,
  preferredTimezone,
  birthDate,
}) {
  const hashedPassword = await bcrypt.hash(password, 12)
  const now = new Date()

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      role,
      activeRole,
      organizerStatus: organizerStatus ?? undefined,
      hashedPassword,
      emailVerified: now,
      termsAcceptedAt: now,
      onboardingCompletedAt: now,
      accountStatus: AccountStatus.ACTIVE,
      headline: headline ?? undefined,
      bio: bio ?? undefined,
      location: location ?? undefined,
      image: image ?? undefined,
      website: website ?? undefined,
      phone: phone ?? undefined,
      preferredLanguage: preferredLanguage ?? undefined,
      preferredCurrency: preferredCurrency ?? undefined,
      preferredTimezone: preferredTimezone ?? undefined,
      birthDate: birthDate ?? undefined,
    },
    create: {
      email,
      name,
      role,
      activeRole,
      organizerStatus: organizerStatus ?? undefined,
      hashedPassword,
      emailVerified: now,
      termsAcceptedAt: now,
      onboardingCompletedAt: now,
      accountStatus: AccountStatus.ACTIVE,
      headline: headline ?? undefined,
      bio: bio ?? undefined,
      location: location ?? undefined,
      image: image ?? undefined,
      website: website ?? undefined,
      phone: phone ?? undefined,
      preferredLanguage: preferredLanguage ?? undefined,
      preferredCurrency: preferredCurrency ?? undefined,
      preferredTimezone: preferredTimezone ?? undefined,
      birthDate: birthDate ?? undefined,
    },
    select: { id: true, email: true, role: true }
  })

  // Ensure notification preferences row exists to match new schema usage
  await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  })

  return user
}

async function main() {
  // Admin
  await upsertUser({
    email: "dev@kamleen.com",
    name: "Kamleen Admin",
    role: UserRole.ADMIN,
    activeRole: UserRole.ADMIN,
    password: "admin123",
  })

  // Organizer
  await upsertUser({
    email: "organizer@kamleen.com",
    name: "Demo Organizer",
    role: UserRole.ORGANIZER,
    activeRole: UserRole.ORGANIZER,
    organizerStatus: OrganizerStatus.APPROVED,
    password: "organizer123",
    headline: "Culinary curator & urban storyteller",
    bio: "Hosting modern city adventures blending food, art and mindfulness.",
    location: "Brooklyn, USA",
    website: "https://demo.organizer.local",
    image: "https://images.unsplash.com/photo-1544006659-f0b21884ce1d?auto=format&fit=crop&w=800&q=80",
    preferredLanguage: "en",
    preferredCurrency: "USD",
    preferredTimezone: "America/New_York",
    phone: "+1 917-555-0199",
  })

  // Explorer
  await upsertUser({
    email: "explorer@kamleen.com",
    name: "Demo Explorer",
    role: UserRole.EXPLORER,
    activeRole: UserRole.EXPLORER,
    password: "explorer123",
    location: "Austin, USA",
    image: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=400&q=80",
    preferredLanguage: "en",
    preferredCurrency: "USD",
    preferredTimezone: "America/Chicago",
    birthDate: new Date("1994-07-22"),
  })

  // Additional organizers with comprehensive profiles
  const organizerSeeds = [
    {
      email: "nora.ahmed@kamleen.com",
      name: "Nora Ahmed",
      headline: "Desert camp host & tea ceremony guide",
      bio: "I create star-lit Sahara camps with Gnawa music, slow food, and mindful tea rituals.",
      location: "Marrakesh, Morocco",
      image: "https://images.unsplash.com/photo-1543877087-ebf71fde2be1?auto=format&fit=crop&w=800&q=80",
      website: "https://sahara-nora.co",
      phone: "+212 6-1234-5678",
      preferredLanguage: "ar",
      preferredCurrency: "MAD",
      preferredTimezone: "Africa/Casablanca",
    },
    {
      email: "li.wei@kamleen.com",
      name: "Li Wei",
      headline: "Ceramicist & tea ceremony guide",
      bio: "Mindful tea experiences and wheel-throwing residencies in a tranquil courtyard studio.",
      location: "Hangzhou, China",
      image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80",
      website: "https://liweinotes.studio",
      phone: "+86 571 5550 1122",
      preferredLanguage: "zh",
      preferredCurrency: "CNY",
      preferredTimezone: "Asia/Shanghai",
    },
    {
      email: "sebastien.laurent@kamleen.com",
      name: "Sébastien Laurent",
      headline: "Adventure curator & eco-guide",
      bio: "Immersive alpine journeys focused on slow travel and glacier preservation.",
      location: "Chamonix, France",
      image: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=800&q=80",
      website: "https://alpineatelier.fr",
      phone: "+33 6 12 34 56 78",
      preferredLanguage: "fr",
      preferredCurrency: "EUR",
      preferredTimezone: "Europe/Paris",
    },
    {
      email: "luna.matsumoto@kamleen.com",
      name: "Luna Matsumoto",
      headline: "Wagashi artist & tea ceremony host",
      bio: "Seasonal wagashi workshops with a modern Kaiseki-inspired tea experience.",
      location: "Kyoto, Japan",
      image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80",
      website: "https://luna-wagashi.jp",
      phone: "+81 75-123-4567",
      preferredLanguage: "ja",
      preferredCurrency: "JPY",
      preferredTimezone: "Asia/Tokyo",
    },
  ]

  for (const organizer of organizerSeeds) {
    await upsertUser({
      ...organizer,
      role: UserRole.ORGANIZER,
      activeRole: UserRole.ORGANIZER,
      organizerStatus: OrganizerStatus.APPROVED,
      password: "organizer123",
    })
  }

  // Additional explorers with diverse locales and preferences
  const explorerSeeds = [
    {
      email: "ella.martinez@kamleen.com",
      name: "Ella Martinez",
      location: "Austin, USA",
      image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
      preferredLanguage: "en",
      preferredCurrency: "USD",
      preferredTimezone: "America/Chicago",
      birthDate: new Date("1992-04-11"),
    },
    {
      email: "sami.iyengar@kamleen.com",
      name: "Sami Iyengar",
      location: "London, UK",
      image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80",
      preferredLanguage: "en",
      preferredCurrency: "GBP",
      preferredTimezone: "Europe/London",
      birthDate: new Date("1988-12-05"),
    },
    {
      email: "noor.almasri@kamleen.com",
      name: "Noor Almasri",
      location: "Dubai, UAE",
      image: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=400&q=80",
      preferredLanguage: "ar",
      preferredCurrency: "AED",
      preferredTimezone: "Asia/Dubai",
      birthDate: new Date("1996-09-23"),
    },
    {
      email: "tomoko.kawai@kamleen.com",
      name: "Tomoko Kawai",
      location: "Kyoto, Japan",
      image: "https://images.unsplash.com/photo-1544723795-43253775f2c9?auto=format&fit=crop&w=400&q=80",
      preferredLanguage: "ja",
      preferredCurrency: "JPY",
      preferredTimezone: "Asia/Tokyo",
      birthDate: new Date("1990-02-14"),
    },
    {
      email: "liam.okafor@kamleen.com",
      name: "Liam Okafor",
      location: "Accra, Ghana",
      image: "https://images.unsplash.com/photo-1544723795-3fb364642b4b?auto=format&fit=crop&w=400&q=80",
      preferredLanguage: "en",
      preferredCurrency: "GHS",
      preferredTimezone: "Africa/Accra",
      birthDate: new Date("1993-03-07"),
    },
    {
      email: "charlotte.ives@kamleen.com",
      name: "Charlotte Ives",
      location: "Seattle, USA",
      image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80",
      preferredLanguage: "en",
      preferredCurrency: "USD",
      preferredTimezone: "America/Los_Angeles",
      birthDate: new Date("1989-11-30"),
    },
    {
      email: "mateo.silva@kamleen.com",
      name: "Mateo Silva",
      location: "Lisbon, Portugal",
      image: "https://images.unsplash.com/photo-1544723795-3fb764c94737?auto=format&fit=crop&w=400&q=80",
      preferredLanguage: "pt",
      preferredCurrency: "EUR",
      preferredTimezone: "Europe/Lisbon",
      birthDate: new Date("1995-01-19"),
    },
    {
      email: "jin.park@kamleen.com",
      name: "Jin Park",
      location: "Seoul, South Korea",
      image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e2?auto=format&fit=crop&w=400&q=80",
      preferredLanguage: "ko",
      preferredCurrency: "KRW",
      preferredTimezone: "Asia/Seoul",
      birthDate: new Date("1997-06-02"),
    },
  ]

  for (const explorer of explorerSeeds) {
    await upsertUser({
      ...explorer,
      role: UserRole.EXPLORER,
      activeRole: UserRole.EXPLORER,
      password: "explorer123",
    })
  }

  console.log("Seeded users (admin, organizer, explorer) successfully.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


