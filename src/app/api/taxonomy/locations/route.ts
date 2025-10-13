import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

export async function GET() {
  const countries = await prisma.country.findMany({
    orderBy: { name: "asc" },
    include: {
      states: {
        orderBy: { name: "asc" },
        include: {
          cities: {
            orderBy: { name: "asc" },
            select: { id: true, name: true, latitude: true, longitude: true },
          },
        },
      },
      cities: {
        where: { stateId: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true, latitude: true, longitude: true },
      },
    },
  })

  const payload = countries.map((country) => ({
    id: country.id,
    name: country.name,
    states: country.states.map((state) => ({
      id: state.id,
      name: state.name,
      cities: state.cities.map((city) => ({ id: city.id, name: city.name, latitude: Number(city.latitude), longitude: Number(city.longitude) })),
    })),
    cities: country.cities.map((city) => ({ id: city.id, name: city.name, latitude: Number(city.latitude), longitude: Number(city.longitude) })),
  }))

  return NextResponse.json({ countries: payload })
}


