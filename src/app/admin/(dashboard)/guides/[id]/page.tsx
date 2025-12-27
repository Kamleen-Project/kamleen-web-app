
import { notFound, redirect } from "next/navigation";
import { GuideEditor } from "@/components/admin/guides/guide-editor";
import { getGuideAdmin } from "@/app/actions/guides";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export default async function EditGuidePage({ params }: { params: Params }) {
    const session = await getServerAuthSession();
    if (!session?.user || session.user.activeRole !== "ADMIN") return redirect("/");

    const { id } = await params;

    // Fetch guide and location data in parallel
    const [guide, countriesRaw] = await Promise.all([
        getGuideAdmin(id),
        prisma.country.findMany({
            orderBy: { name: "asc" },
            include: {
                states: {
                    orderBy: { name: "asc" },
                    include: {
                        cities: { orderBy: { name: "asc" }, select: { id: true, name: true, latitude: true, longitude: true } },
                    },
                },
                cities: {
                    where: { stateId: null },
                    orderBy: { name: "asc" },
                    select: { id: true, name: true, latitude: true, longitude: true },
                },
            },
        }),
    ]);

    if (!guide) {
        return notFound();
    }

    const countries = countriesRaw.map((country) => ({
        id: country.id,
        name: country.name,
        states: country.states.map((state) => ({
            id: state.id,
            name: state.name,
            cities: state.cities.map((city) => ({ id: city.id, name: city.name, latitude: Number(city.latitude), longitude: Number(city.longitude) })),
        })),
        cities: country.cities.map((city) => ({ id: city.id, name: city.name, latitude: Number(city.latitude), longitude: Number(city.longitude) })),
    }));

    const serializedGuide = {
        ...guide,
        latitude: guide.latitude ? Number(guide.latitude) : null,
        longitude: guide.longitude ? Number(guide.longitude) : null,
    };

    return (
        <div className="flex-1 bg-background">
            <GuideEditor guide={serializedGuide} countries={countries} />
        </div>
    );
}
