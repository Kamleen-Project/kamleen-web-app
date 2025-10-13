import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerAuthSession()

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const countries = await prisma.country.findMany({
    orderBy: { name: "asc" },
    include: {
    states: {
      orderBy: { name: "asc" },
      include: {
        cities: {
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            subtitle: true,
            picture: true,
            latitude: true,
            longitude: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                experiences: true,
              },
            },
          },
        },
        _count: {
          select: {
            cities: true,
            experiences: true,
          },
        },
      },
    },
    cities: {
      where: { stateId: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        subtitle: true,
        picture: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            experiences: true,
          },
        },
      },
    },
      _count: {
        select: {
          states: true,
          cities: true,
          experiences: true,
        },
      },
    },
  })

  const payload = countries.map((country) => ({
    id: country.id,
    name: country.name,
    subtitle: country.subtitle,
    picture: country.picture,
    latitude: country.latitude,
    longitude: country.longitude,
    stats: {
      stateCount: country._count.states,
      cityCount: country._count.cities,
      experienceCount: country._count.experiences,
    },
    createdAt: country.createdAt,
    updatedAt: country.updatedAt,
    states: country.states.map((state) => ({
      id: state.id,
      name: state.name,
      subtitle: state.subtitle,
      picture: state.picture,
      latitude: state.latitude,
      longitude: state.longitude,
      stats: {
        cityCount: state._count.cities,
        experienceCount: state._count.experiences,
      },
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
      cities: state.cities.map((city) => ({
        id: city.id,
        name: city.name,
        subtitle: city.subtitle,
        picture: city.picture,
        latitude: city.latitude,
        longitude: city.longitude,
        experienceCount: city._count?.experiences ?? 0,
        createdAt: city.createdAt,
        updatedAt: city.updatedAt,
      })),
    })),
    cities: country.cities.map((city) => ({
      id: city.id,
      name: city.name,
      subtitle: city.subtitle,
      picture: city.picture,
      latitude: city.latitude,
      longitude: city.longitude,
      experienceCount: city._count?.experiences ?? 0,
      createdAt: city.createdAt,
      updatedAt: city.updatedAt,
    })),
  }))

  return NextResponse.json({ countries: payload })
}

