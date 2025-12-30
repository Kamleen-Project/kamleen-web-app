
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://kamleen.com'

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/api/', '/dashboard/'],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}
