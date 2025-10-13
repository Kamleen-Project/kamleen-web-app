import { PrismaClient } from "../src/generated/prisma/index.js"

const prisma = new PrismaClient()

function unsplash(query) {
  // Simple helper to keep images consistent and royalty-free
  const encoded = encodeURIComponent(query)
  return `https://images.unsplash.com/photo-152-${Math.floor(Math.random() * 999999)}?auto=format&fit=crop&w=1600&q=80&query=${encoded}`
}

/**
 * Experience Categories — cover the majority of experiences
 */
const categories = [
  { name: "Adventure", subtitle: "Hikes, treks and outdoor thrills", picture: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80" },
  { name: "Culinary", subtitle: "Cooking, tastings and market tours", picture: "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=1600&q=80" },
  { name: "Wellness", subtitle: "Mindfulness, movement and restoration", picture: "https://images.unsplash.com/photo-1517346665566-17b9c7d4f37b?auto=format&fit=crop&w=1600&q=80" },
  { name: "Creative", subtitle: "Hands-on arts, crafts and making", picture: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80" },
  { name: "Cultural", subtitle: "Local heritage and storytelling", picture: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=1600&q=80" },
  { name: "Nature", subtitle: "Parks, forests and wildlife", picture: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=80" },
  { name: "Nightlife", subtitle: "Evening scenes and social vibes", picture: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1600&q=80" },
  { name: "History", subtitle: "Monuments, museums and ruins", picture: "https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?auto=format&fit=crop&w=1600&q=80" },
  { name: "Music & Dance", subtitle: "Live performances and workshops", picture: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1600&q=80" },
  { name: "Family", subtitle: "All-ages friendly experiences", picture: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1600&q=80" },
]

/**
 * Countries, their regions (states) and cities
 * All coordinates are approximate for seeding.
 */
const countries = [
  {
    name: "Morocco",
    subtitle: "From Sahara dunes to Atlas peaks",
    picture: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
    latitude: 31.7917,
    longitude: -7.0926,
    states: [
      { name: "Tanger-Tétouan-Al Hoceïma", latitude: 35.172, longitude: -5.269 },
      { name: "Oriental", latitude: 34.682, longitude: -2.573 },
      { name: "Fès-Meknès", latitude: 33.533, longitude: -5.100 },
      { name: "Rabat-Salé-Kénitra", latitude: 34.000, longitude: -6.500 },
      { name: "Béni Mellal-Khénifra", latitude: 32.500, longitude: -6.500 },
      { name: "Casablanca-Settat", latitude: 33.573, longitude: -7.589 },
      { name: "Marrakech-Safi", latitude: 31.630, longitude: -8.000 },
      { name: "Drâa-Tafilalet", latitude: 31.100, longitude: -5.000 },
      { name: "Souss-Massa", latitude: 30.300, longitude: -9.600 },
      { name: "Guelmim-Oued Noun", latitude: 28.980, longitude: -10.060 },
      { name: "Laâyoune-Sakia El Hamra", latitude: 27.150, longitude: -13.200 },
      { name: "Dakhla-Oued Ed-Dahab", latitude: 23.700, longitude: -15.900 },
    ],
    cities: [
      { name: "Marrakech", picture: "https://images.unsplash.com/photo-1544989164-31dc3c645987?auto=format&fit=crop&w=1600&q=80", latitude: 31.629, longitude: -7.981, state: "Marrakech-Safi" },
      { name: "Fes", picture: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&q=80", latitude: 34.018, longitude: -5.007, state: "Fès-Meknès" },
      { name: "Casablanca", picture: "https://images.unsplash.com/photo-1544989163-a7d4f9b2d1c4?auto=format&fit=crop&w=1600&q=80", latitude: 33.573, longitude: -7.589, state: "Casablanca-Settat" },
      { name: "Rabat", picture: "https://images.unsplash.com/photo-1605190584870-3b727d0fd2bd?auto=format&fit=crop&w=1600&q=80", latitude: 34.020, longitude: -6.841, state: "Rabat-Salé-Kénitra" },
      { name: "Chefchaouen", picture: "https://images.unsplash.com/photo-1528821154947-1aa3d1a37a25?auto=format&fit=crop&w=1600&q=80", latitude: 35.171, longitude: -5.270, state: "Tanger-Tétouan-Al Hoceïma" },
      { name: "Essaouira", picture: "https://images.unsplash.com/photo-1544989153-84f6f980c9b6?auto=format&fit=crop&w=1600&q=80", latitude: 31.508, longitude: -9.760, state: "Marrakech-Safi" },
      { name: "Agadir", picture: "https://images.unsplash.com/photo-1576678927484-ccff9cc2b06a?auto=format&fit=crop&w=1600&q=80", latitude: 30.428, longitude: -9.598, state: "Souss-Massa" },
      { name: "Meknes", picture: "https://images.unsplash.com/photo-1611686892450-4c0f7aaf5121?auto=format&fit=crop&w=1600&q=80", latitude: 33.895, longitude: -5.555, state: "Fès-Meknès" },
      { name: "Ouarzazate", picture: "https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&w=1600&q=80", latitude: 30.919, longitude: -6.893, state: "Drâa-Tafilalet" },
      { name: "Tangier", picture: "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1600&q=80", latitude: 35.759, longitude: -5.834, state: "Tanger-Tétouan-Al Hoceïma" },
      { name: "Asilah", picture: "https://images.unsplash.com/photo-1590650006861-3dfcc5a2ddca?auto=format&fit=crop&w=1600&q=80", latitude: 35.465, longitude: -6.034, state: "Tanger-Tétouan-Al Hoceïma" },
      { name: "Merzouga", picture: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1600&q=80", latitude: 31.099, longitude: -4.012, state: "Drâa-Tafilalet" },
      { name: "Ifrane", picture: "https://images.unsplash.com/photo-1607280719967-930934df3a9a?auto=format&fit=crop&w=1600&q=80", latitude: 33.533, longitude: -5.117, state: "Fès-Meknès" },
    ],
  },
  {
    name: "France",
    subtitle: "From alpine peaks to Riviera coasts",
    picture: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=80",
    latitude: 46.2276,
    longitude: 2.2137,
    states: [
      { name: "Île-de-France", latitude: 48.8566, longitude: 2.3522 },
      { name: "Provence-Alpes-Côte d'Azur", latitude: 43.9352, longitude: 6.0679 },
      { name: "Auvergne-Rhône-Alpes", latitude: 45.7640, longitude: 4.8357 },
      { name: "Occitanie", latitude: 43.6045, longitude: 1.4440 },
      { name: "Nouvelle-Aquitaine", latitude: 44.8378, longitude: -0.5792 },
      { name: "Grand Est", latitude: 48.5734, longitude: 7.7521 },
      { name: "Hauts-de-France", latitude: 50.6292, longitude: 3.0573 },
      { name: "Normandie", latitude: 49.1829, longitude: -0.3707 },
      { name: "Bretagne", latitude: 48.2020, longitude: -2.9326 },
      { name: "Pays de la Loire", latitude: 47.2184, longitude: -1.5536 },
      { name: "Centre-Val de Loire", latitude: 47.9029, longitude: 1.9093 },
      { name: "Bourgogne-Franche-Comté", latitude: 47.3220, longitude: 5.0415 },
      { name: "Corse", latitude: 42.0396, longitude: 9.0129 },
    ],
    cities: [
      { name: "Paris", picture: "https://images.unsplash.com/photo-1497493292307-31c376b6e479?auto=format&fit=crop&w=1600&q=80", latitude: 48.8566, longitude: 2.3522, state: "Île-de-France" },
      { name: "Nice", picture: "https://images.unsplash.com/photo-1505764706515-aa95265c5abc?auto=format&fit=crop&w=1600&q=80", latitude: 43.7102, longitude: 7.2620, state: "Provence-Alpes-Côte d'Azur" },
      { name: "Lyon", picture: "https://images.unsplash.com/photo-1565728563-48f6b6b6e1b2?auto=format&fit=crop&w=1600&q=80", latitude: 45.7640, longitude: 4.8357, state: "Auvergne-Rhône-Alpes" },
      { name: "Marseille", picture: "https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?auto=format&fit=crop&w=1600&q=80", latitude: 43.2965, longitude: 5.3698, state: "Provence-Alpes-Côte d'Azur" },
      { name: "Bordeaux", picture: "https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?auto=format&fit=crop&w=1600&q=80", latitude: 44.8378, longitude: -0.5792, state: "Nouvelle-Aquitaine" },
      { name: "Toulouse", picture: "https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?auto=format&fit=crop&w=1600&q=80", latitude: 43.6045, longitude: 1.4440, state: "Occitanie" },
      { name: "Strasbourg", picture: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80", latitude: 48.5734, longitude: 7.7521, state: "Grand Est" },
      { name: "Lille", picture: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1600&q=80", latitude: 50.6292, longitude: 3.0573, state: "Hauts-de-France" },
      { name: "Nantes", picture: "https://images.unsplash.com/photo-1517346665566-17b9c7d4f37b?auto=format&fit=crop&w=1600&q=80", latitude: 47.2184, longitude: -1.5536, state: "Pays de la Loire" },
      { name: "Montpellier", picture: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=1600&q=80", latitude: 43.6108, longitude: 3.8767, state: "Occitanie" },
      { name: "Cannes", picture: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1600&q=80", latitude: 43.5528, longitude: 7.0174, state: "Provence-Alpes-Côte d'Azur" },
      { name: "Saint-Tropez", picture: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=80", latitude: 43.2672, longitude: 6.6400, state: "Provence-Alpes-Côte d'Azur" },
      { name: "Annecy", picture: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=80", latitude: 45.8992, longitude: 6.1296, state: "Auvergne-Rhône-Alpes" },
      { name: "Chamonix", picture: "https://images.unsplash.com/photo-1517824305544-b6318e01526b?auto=format&fit=crop&w=1600&q=80", latitude: 45.9237, longitude: 6.8694, state: "Auvergne-Rhône-Alpes" },
      { name: "Colmar", picture: "https://images.unsplash.com/photo-1523419409543-0c1df022bdd2?auto=format&fit=crop&w=1600&q=80", latitude: 48.0790, longitude: 7.3585, state: "Grand Est" },
      { name: "Avignon", picture: "https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?auto=format&fit=crop&w=1600&q=80", latitude: 43.9493, longitude: 4.8055, state: "Provence-Alpes-Côte d'Azur" },
      { name: "Aix-en-Provence", picture: "https://images.unsplash.com/photo-1512391464763-07803d8f4ee0?auto=format&fit=crop&w=1600&q=80", latitude: 43.5297, longitude: 5.4474, state: "Provence-Alpes-Côte d'Azur" },
    ],
  },
]

async function upsertCategories() {
  for (const cat of categories) {
    await prisma.experienceCategory.upsert({
      where: { name: cat.name },
      update: { subtitle: cat.subtitle, picture: cat.picture },
      create: { name: cat.name, subtitle: cat.subtitle, picture: cat.picture },
    })
  }
}

async function upsertLocations() {
  for (const country of countries) {
    const countryRecord = await prisma.country.upsert({
      where: { name: country.name },
      update: {
        subtitle: country.subtitle,
        picture: country.picture,
        latitude: country.latitude,
        longitude: country.longitude,
      },
      create: {
        name: country.name,
        subtitle: country.subtitle,
        picture: country.picture,
        latitude: country.latitude,
        longitude: country.longitude,
      },
    })

    const stateNameToId = new Map()
    for (const st of country.states) {
      const stateRecord = await prisma.state.upsert({
        where: { countryId_name: { countryId: countryRecord.id, name: st.name } },
        update: {
          subtitle: st.subtitle ?? null,
          latitude: st.latitude ?? null,
          longitude: st.longitude ?? null,
          picture: st.picture ?? null,
          countryId: countryRecord.id,
        },
        create: {
          name: st.name,
          subtitle: st.subtitle ?? null,
          latitude: st.latitude ?? null,
          longitude: st.longitude ?? null,
          picture: st.picture ?? null,
          countryId: countryRecord.id,
        },
      })
      stateNameToId.set(st.name, stateRecord.id)
    }

    for (const ct of country.cities) {
      const stateId = ct.state ? stateNameToId.get(ct.state) ?? null : null

      await prisma.city.upsert({
        where: {
          countryId_stateId_name: {
            countryId: countryRecord.id,
            stateId: stateId,
            name: ct.name,
          },
        },
        update: {
          subtitle: ct.subtitle ?? null,
          picture: ct.picture ?? unsplash(`${country.name} ${ct.name}`),
          latitude: ct.latitude,
          longitude: ct.longitude,
          countryId: countryRecord.id,
          stateId: stateId,
        },
        create: {
          name: ct.name,
          subtitle: ct.subtitle ?? null,
          picture: ct.picture ?? unsplash(`${country.name} ${ct.name}`),
          latitude: ct.latitude,
          longitude: ct.longitude,
          countryId: countryRecord.id,
          stateId: stateId,
        },
      })
    }
  }
}

async function main() {
  await upsertCategories()
  await upsertLocations()
}

main()
  .then(() => {
    console.log("Seeded categories, countries, states, and cities successfully.")
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


