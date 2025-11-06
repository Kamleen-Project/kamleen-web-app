import { PrismaClient } from "../src/generated/prisma/index.js"

const prisma = new PrismaClient()

function slugify(input) {
	return input
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9\s-]/g, "")
		.trim()
		.replace(/[\s_-]+/g, "-")
		.replace(/^-+|-+$/g, "")
}

function imageUrl(seed, width = 1600, height = 1067) {
	const encoded = encodeURIComponent(String(seed))
	return `https://picsum.photos/seed/${encoded}/${width}/${height}`
}

function formatDurationLabel(totalHours) {
	const hours = Math.floor(totalHours)
	const minutes = Math.round((totalHours - hours) * 60)
	const days = Math.floor(hours / 24)
	const remHours = hours % 24
	const parts = []
	if (days) parts.push(`${days} day${days === 1 ? '' : 's'}`)
	if (remHours) parts.push(`${remHours} hour${remHours === 1 ? '' : 's'}`)
	if (minutes) parts.push(`${minutes} min`)
	if (!parts.length) parts.push('0 min')
	return parts.join(' ')
}

function buildSession({ inDays, hour, durationHours, capacity, priceOverride, meeting }) {
	const start = new Date()
	start.setDate(start.getDate() + inDays)
	start.setHours(hour, 0, 0, 0)
	return {
		startAt: start,
		duration: formatDurationLabel(durationHours),
		capacity,
		priceOverride: priceOverride ?? null,
		locationLabel: meeting?.label ?? null,
		meetingAddress: meeting?.address ?? null,
		meetingLatitude: meeting?.latitude ?? null,
		meetingLongitude: meeting?.longitude ?? null,
	}
}

function pick(arr, i) {
	return arr[i % arr.length]
}

async function ensureOrganizerPool() {
	const organizers = await prisma.user.findMany({
		where: { role: "ORGANIZER" },
		select: { id: true, name: true },
	})
	if (organizers.length > 0) return organizers
	const created = await prisma.user.create({
		data: {
			email: "seed.organizer@together.dev",
			name: "Seed Organizer",
			role: "ORGANIZER",
			activeRole: "ORGANIZER",
			organizerStatus: "APPROVED",
			accountStatus: "ACTIVE",
		},
		select: { id: true, name: true },
	})
	return [created]
}

async function ensureExplorerPool() {
	const explorers = await prisma.user.findMany({ where: { role: "EXPLORER" }, select: { id: true } })
	if (explorers.length > 0) return explorers
	const created = []
	for (let i = 0; i < 6; i += 1) {
		const u = await prisma.user.create({
			data: {
				email: `seed.explorer+${i}@together.dev`,
				name: `Seed Explorer ${i + 1}`,
				role: "EXPLORER",
				activeRole: "EXPLORER",
				accountStatus: "ACTIVE",
			},
			select: { id: true },
		})
		created.push(u)
	}
	return created
}

async function loadGeo() {
	// Prefer richer geodata when available
	const [countries, states, cities] = await Promise.all([
		prisma.country.findMany({ select: { id: true, name: true } }),
		prisma.state.findMany({ select: { id: true, name: true, countryId: true } }),
		prisma.city.findMany({ select: { id: true, name: true, countryId: true, stateId: true, latitude: true, longitude: true, picture: true } }),
	])
	return { countries, states, cities }
}

function buildExperienceBlueprint(category, city, index) {
	const catName = category.name
	const baseTitles = [
		`${catName} Immersion: ${city.name} Edition`,
		`${catName} Workshop at ${city.name} Studios`,
		`${city.name} ${catName} Journey`,
		`${catName} Night at ${city.name}`,
		`${catName} Lab: ${city.name} Creators`,
		`${catName} Pathways in ${city.name}`,
		`${city.name} ${catName} Collective`,
		`${catName} Stories of ${city.name}`,
		`${catName} Retreat near ${city.name}`,
		`${catName} Field Guide — ${city.name}`,
		`${catName} Pop-up in ${city.name}`,
		`${catName} Discovery Walk — ${city.name}`,
	]
	const title = baseTitles[index % baseTitles.length]
	const summary = `A curated ${catName.toLowerCase()} experience in ${city.name} blending hands-on practice, local stories, and community.`
	const description = `Dive into a thoughtfully designed ${catName.toLowerCase()} journey across ${city.name}. Expect small group dynamics, intentional pacing, and moments to connect. We'll explore signature techniques, meet local contributors, and create keepsakes you can carry forward.`

	const priceBase = 35 + (index % 12) * 10
	const durationHours = [1.5, 2, 2.5, 3, 4, 5, 6][index % 7]

	const baseSeed = `${category.slug}-${city.name}-${index}`
	const heroImage = imageUrl(`${baseSeed}-hero`)
	const galleryImages = [
		imageUrl(`${baseSeed}-1`),
		imageUrl(`${baseSeed}-2`),
		imageUrl(`${baseSeed}-3`),
		imageUrl(`${baseSeed}-4`),
		imageUrl(`${baseSeed}-5`),
	]

	const tags = [catName.toLowerCase(), city.name.toLowerCase(), "community", "hands-on"].slice(0, 3 + (index % 2))

	const itinerary = [
		{ title: "Welcome & orientation", subtitle: `Set intentions and meet the group in ${city.name}.`, image: galleryImages[1] },
		{ title: "Guided practice", subtitle: `Hands-on ${catName.toLowerCase()} segment with step-by-step coaching.`, image: galleryImages[2] },
		{ title: "Showcase & reflections", subtitle: "Share outcomes, capture memories, and plan your next steps.", image: galleryImages[3] },
	]

	const meeting = {
		address: `Central ${city.name} meeting point`,
		label: `${city.name} center`,
		latitude: city.latitude,
		longitude: city.longitude,
	}

	const sessions = [
		{ inDays: 7 + (index % 5), hour: 10 + (index % 6), durationHours, capacity: 10 + (index % 8), priceOverride: null, meeting },
		{ inDays: 21 + (index % 7), hour: 16, durationHours, capacity: 10 + ((index + 2) % 8), priceOverride: priceBase + 10, meeting },
	]

	return {
		title,
		summary,
		description,
		duration: formatDurationLabel(durationHours),
		price: Math.round(priceBase),
		currency: "USD",
		heroImage,
		galleryImages,
		tags,
		itinerary,
		sessions,
	}
}

async function seed() {
	const [organizers, explorers] = await Promise.all([ensureOrganizerPool(), ensureExplorerPool()])
	const { countries, states, cities } = await loadGeo()

	if (cities.length === 0) {
		throw new Error("No cities found. Seed taxonomy (countries/states/cities) before experiences.")
	}

	// Load existing categories only; do not create new ones
	const categories = await prisma.experienceCategory.findMany({ select: { id: true, name: true, slug: true } })
	if (categories.length === 0) {
		throw new Error("No categories found in DB. Create categories in the app before seeding experiences.")
	}

	// Remove all existing experiences (cascades will clean sessions/itinerary/reviews/bookings)
	await prisma.experience.deleteMany({})

	let createdCount = 0
	for (const [catIndex, category] of categories.entries()) {
		for (let i = 0; i < 12; i += 1) {
			const organizer = pick(organizers, catIndex + i)
			const city = pick(cities, catIndex * 13 + i)
			const country = countries.find((c) => c.id === city.countryId) || pick(countries, i)
			const state = states.find((s) => s.id === city.stateId) || null

			const blueprint = buildExperienceBlueprint(category, city, i)
			const baseSlug = slugify(`${category.slug}-${blueprint.title}`) || `exp-${catIndex}-${i}`
			let slug = baseSlug
			let suffix = 1
			// Guarantee slug uniqueness
			while (await prisma.experience.findUnique({ where: { slug } })) {
				slug = `${baseSlug}-${suffix}`
				suffix += 1
			}

			const created = await prisma.experience.create({
				data: {
					organizerId: organizer.id,
					title: blueprint.title,
					slug,
					summary: blueprint.summary,
					description: blueprint.description,
					location: city.name,
					duration: blueprint.duration,
					price: blueprint.price,
					currency: blueprint.currency,
					heroImage: blueprint.heroImage,
					galleryImages: blueprint.galleryImages,
					tags: blueprint.tags,
					categoryId: category.id,
					category: category.slug,
					meetingAddress: blueprint.sessions[0].meeting?.address ?? null,
					meetingCity: city.name,
					meetingCountry: country.name,
					meetingLatitude: city.latitude,
					meetingLongitude: city.longitude,
					countryId: country.id,
					stateId: state?.id ?? null,
					cityId: city.id,
					sessions: { create: blueprint.sessions.map(buildSession) },
					itinerarySteps: {
						create: blueprint.itinerary.map((step, order) => ({ order, title: step.title, subtitle: step.subtitle ?? null, image: step.image })),
					},
				},
				select: { id: true },
			})

			// Seed lightweight reviews to reflect engagement
			const reviewCount = 8 + ((catIndex + i) % 8)
			const reviewData = []
			let totalRating = 0
			for (let r = 0; r < reviewCount; r += 1) {
				const explorer = pick(explorers, catIndex * 19 + i + r)
				const rating = 4 + ((i + r) % 2) // 4 or 5
				reviewData.push({ experienceId: created.id, explorerId: explorer.id, rating, comment: null, createdAt: new Date(Date.now() - (i * 7 + r) * 24 * 60 * 60 * 1000) })
				totalRating += rating
			}
			if (reviewData.length) {
				await prisma.experienceReview.createMany({ data: reviewData })
				await prisma.experience.update({ where: { id: created.id }, data: { averageRating: Number((totalRating / reviewData.length).toFixed(2)), reviewCount: reviewData.length } })
			}

			createdCount += 1
		}
	}

	return createdCount
}

async function main() {
	const count = await seed()
	console.log(`Seeded ${count} experiences across existing categories.`)
}

main()
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})


