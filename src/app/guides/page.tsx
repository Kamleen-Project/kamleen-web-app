
import { Container } from "@/components/layout/container";
import { getPublishedGuides } from "@/app/actions/guides";
import { GuideCard } from "@/components/guides/guide-card";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getServerAuthSession } from "@/lib/auth";

export const metadata = {
    title: "Guides - Kamleen",
    description: "Explore our latest guides, tips, and stories.",
};

export default async function GuidesPage() {
    const session = await getServerAuthSession();
    const { guides } = await getPublishedGuides(1, 100); // Pagination later

    return (
        <main className="min-h-screen py-12 md:py-20 bg-background">
            <Container>
                <div className="mb-12 text-center max-w-2xl mx-auto space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Recent Guides</h1>
                    <p className="text-lg text-muted-foreground">Discover stories, tips, and insights from our community.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {guides.map((guide) => (
                        <GuideCard key={guide.id} guide={guide} />
                    ))}
                </div>
            </Container>
        </main>
    );
}
