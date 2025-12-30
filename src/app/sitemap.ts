
import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://kamleen.com'

    // Static routes
    const routes = [
        '',
        '/categories',
        '/faq',
        '/become-organizer',
        '/privacy',
        '/terms',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: route === '' ? 1 : 0.8,
    }))

    // Dynamic routes

    // Experiences
    let experiences: { slug: string; updatedAt: Date }[] = []
    try {
        experiences = await prisma.experience.findMany({
            where: {
                status: 'PUBLISHED',
            },
            select: {
                slug: true,
                updatedAt: true,
            },
        })
    } catch (error) {
        console.error('Failed to fetch experiences for sitemap:', error)
    }

    // Guides
    let guides: { slug: string; updatedAt: Date; publishedAt: Date | null }[] = []
    try {
        guides = await prisma.guide.findMany({
            where: {
                status: 'PUBLISHED',
            },
            select: {
                slug: true,
                updatedAt: true,
                publishedAt: true,
            },
        })
    } catch (error) {
        console.error('Failed to fetch guides for sitemap:', error)
    }

    // Experience URLs
    const experienceUrls = experiences.map((experience) => ({
        url: `${baseUrl}/experiences/${experience.slug}`,
        lastModified: experience.updatedAt,
        changeFrequency: 'daily' as const,
        priority: 0.9,
    }))

    // Guide URLs
    const guideUrls = guides.map((guide) => ({
        url: `${baseUrl}/guides/${guide.slug}`,
        lastModified: guide.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
    }))

    return [...routes, ...experienceUrls, ...guideUrls]
}
