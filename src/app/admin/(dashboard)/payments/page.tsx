import { redirect } from "next/navigation";

import { ConsolePage } from "@/components/console/page";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminPaymentsPage() {
	const session = await getServerAuthSession();
	if (!session?.user || session.user.role !== "ADMIN") {
		redirect("/admin/login?error=forbidden");
	}

	const payments = await prisma.payment.findMany({
		take: 50,
		orderBy: { createdAt: "desc" },
		include: {
			booking: {
				select: {
					id: true,
					status: true,
					totalPrice: true,
					experience: { select: { title: true } },
					explorer: { select: { name: true, email: true } },
				},
			},
		},
	});

	return (
		<ConsolePage title="Payments" subtitle="Recent transactions across the platform.">
			<div className="overflow-x-auto">
				<table className="w-full text-left text-sm">
					<thead>
						<tr className="border-b text-xs text-muted-foreground">
							<th className="px-2 py-2">Created</th>
							<th className="px-2 py-2">Provider</th>
							<th className="px-2 py-2">Status</th>
							<th className="px-2 py-2">Amount</th>
							<th className="px-2 py-2">Currency</th>
							<th className="px-2 py-2">Booking</th>
							<th className="px-2 py-2">Explorer</th>
							<th className="px-2 py-2">Experience</th>
						</tr>
					</thead>
					<tbody>
						{payments.map((p) => (
							<tr key={p.id} className="border-b">
								<td className="px-2 py-2">{new Date(p.createdAt).toLocaleString()}</td>
								<td className="px-2 py-2">{p.provider}</td>
								<td className="px-2 py-2">{p.status}</td>
								<td className="px-2 py-2">{(p.amount / 100).toFixed(2)}</td>
								<td className="px-2 py-2">{p.currency}</td>
								<td className="px-2 py-2">
									{p.booking.id} ({p.booking.status})
								</td>
								<td className="px-2 py-2">{p.booking.explorer.name ?? p.booking.explorer.email}</td>
								<td className="px-2 py-2">{p.booking.experience.title}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</ConsolePage>
	);
}
