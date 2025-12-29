
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDistanceToNowStrict, format } from "date-fns";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";

import { Container } from "@/components/layout/container";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { GuideCard } from "@/components/guides/guide-card";
import { CommentSection } from "@/components/guides/comment-section";
import { getGuideBySlug, getRelatedGuides, getAdjacentGuides } from "@/app/actions/guides";
import { getServerAuthSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
    const { slug } = await params;
    const guide = await getGuideBySlug(slug);
    if (!guide) return {};

    return {
        title: guide.metaTitle || guide.title,
        description: guide.metaDescription || guide.excerpt,
        openGraph: {
            title: guide.metaTitle || guide.title,
            description: guide.metaDescription || guide.excerpt,
            images: guide.featuredImage ? [guide.featuredImage] : [],
        }
    };
}

import { PreviewBar } from "@/components/admin/preview-bar";

export default async function GuidePage({ params }: { params: Params }) {
    const session = await getServerAuthSession();
    const { slug } = await params;
    const guide = await getGuideBySlug(slug); // Include published check

    if (!guide) {
        return notFound();
    }
    // If not published and found, it must be admin (due to update in action)
    if (guide.status !== "PUBLISHED") {
        const isAdmin = session?.user?.activeRole === "ADMIN";
        if (!isAdmin) return notFound();
    }

    const relatedGuides = await getRelatedGuides(slug, guide.tags);
    // Handle status for adjacent logic? Usually adjacent should be only public. Action handles that.
    const adjacent = await getAdjacentGuides(guide.id, guide.publishedAt || new Date());

    return (
        <main className="min-h-screen bg-background pb-20">
            <PreviewBar status={guide.status} editUrl={`/admin/guides/${guide.id}`} />
            {/* Hero */}
            <div className="relative w-full">
                <div className="relative h-[200px] md:h-[400px]">
                    <ImageWithFallback
                        src={guide.featuredImage || "/images/exp-placeholder.png"}
                        fallbackSrc="/images/exp-placeholder.png"
                        alt={guide.title}
                        fill
                        priority
                        className="object-cover opacity-85"
                    />
                </div>
                <Container className="pt-6 md:pt-12 pb-2 max-w-5xl lg:px-0">
                    <div className="max-w-4xl space-y-4">
                        <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground leading-[1.4]">{guide.title}</h1>
                        <div className="flex items-center gap-2 text-sm md:text-base font-medium text-muted-foreground/90">
                            {guide.tags.length > 0 && (
                                <Badge variant="soft" className="bg-primary/20 text-primary border-none">{guide.tags[0]}</Badge>
                            )}
                            <span>•</span>
                            <span>{format(guide.publishedAt || guide.createdAt, "MMMM d, yyyy")}</span>
                            {/* <span>•</span> */}
                            {/* <span>{guide.author.name}</span> */}
                        </div>
                        {(guide.address || guide.city || guide.country) && (
                            <div className="flex items-center gap-2 text-muted-foreground mt-2">
                                <MapPin className="h-4 w-4" />
                                <span className="text-base font-medium">
                                    {[guide.address, guide.city, guide.country].filter(Boolean).join(" , ")}
                                </span>
                            </div>
                        )}
                    </div>
                </Container>
            </div>

            <Container className="mt-12">
                <div className="max-w-5xl mx-auto">
                    {/* Article Content */}
                    <article className="prose prose-lg dark:prose-invert max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: guide.content }} />
                    </article>
                </div>

                {/* Navigation */}
                <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-8 max-w-5xl mx-auto lg:px-0">
                    {adjacent.prev ? (
                        <Link href={`/guides/${adjacent.prev.slug}`} className="group flex flex-col items-start gap-1 p-4 rounded-lg border hover:bg-muted/50 transition">
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <ChevronLeft className="h-4 w-4" /> Previous
                            </span>
                            <span className="font-semibold group-hover:text-primary">{adjacent.prev.title}</span>
                        </Link>
                    ) : <div />}
                    {adjacent.next ? (
                        <Link href={`/guides/${adjacent.next.slug}`} className="group flex flex-col items-end gap-1 p-4 rounded-lg border hover:bg-muted/50 transition">
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                                Next <ChevronRight className="h-4 w-4" />
                            </span>
                            <span className="font-semibold group-hover:text-primary">{adjacent.next.title}</span>
                        </Link>
                    ) : <div />}
                </div>

                {/* Comments */}
                <div className="max-w-5xl mt-12 mx-auto lg:px-0">
                    <CommentSection guideId={guide.id} comments={guide.comments} />
                </div>

                {/* Related Guides */}
                {relatedGuides.length > 0 && (
                    <div className="mt-20 border-t pt-12">
                        <h2 className="text-3xl font-bold mb-8">Related Guides</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {relatedGuides.map(g => (
                                <GuideCard key={g.id} guide={g} />
                            ))}
                        </div>
                    </div>
                )}
            </Container>

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Article",
                        headline: guide.title,
                        description: guide.excerpt ?? guide.metaDescription,
                        image: guide.featuredImage ? [guide.featuredImage] : undefined,
                        datePublished: guide.publishedAt ? new Date(guide.publishedAt).toISOString() : new Date(guide.createdAt).toISOString(),
                        dateModified: new Date(guide.updatedAt).toISOString(),
                        author: {
                            "@type": "Person",
                            name: guide.author.name,
                            image: guide.author.image,
                        },
                        publisher: {
                            "@type": "Organization",
                            name: "Kamleen",
                            logo: {
                                "@type": "ImageObject",
                                url: "https://kamleen.com/images/logo.png", // Replace with your actual logo URL if different
                            },
                        },
                        mainEntityOfPage: {
                            "@type": "WebPage",
                            "@id": `https://kamleen.com/guides/${guide.slug}`,
                        },
                    }),
                }}
            />
        </main>
    );
}
