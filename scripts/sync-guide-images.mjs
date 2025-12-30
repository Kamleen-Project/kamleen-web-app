
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("../src/generated/prisma/index.js");

const prisma = new PrismaClient();

async function main() {
    console.log('Starting migration of guide images to GuideImage table...');

    const guides = await prisma.guide.findMany({
        select: {
            id: true,
            title: true,
            featuredImage: true,
            content: true,
        }
    });

    console.log(`Found ${guides.length} guides.`);

    for (const guide of guides) {
        if (guide.featuredImage) {
            // Check if already exists
            const existing = await prisma.guideImage.findFirst({
                where: {
                    guideId: guide.id,
                    url: guide.featuredImage
                }
            });

            if (!existing) {
                await prisma.guideImage.create({
                    data: {
                        guideId: guide.id,
                        url: guide.featuredImage,
                        alt: `${guide.title} featured image`,
                        status: 'APPROVED',
                    }
                });
                console.log(`Created GuideImage for guide ${guide.title} (featured)`);
            }
        }

        // Optional: Parse content for images
        // Simple regex to find <img src="...">
        const imgRegex = /<img[^>]+src="([^">]+)"/g;
        let match;
        while ((match = imgRegex.exec(guide.content)) !== null) {
            const url = match[1];
            if (url) {
                const existingContentImg = await prisma.guideImage.findFirst({
                    where: {
                        guideId: guide.id,
                        url: url
                    }
                });

                if (!existingContentImg) {
                    await prisma.guideImage.create({
                        data: {
                            guideId: guide.id,
                            url: url,
                            alt: `${guide.title} content image`,
                            status: 'APPROVED',
                        }
                    });
                    console.log(`Created GuideImage for guide ${guide.title} (content)`);
                }
            }
        }
    }

    console.log('Migration completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
