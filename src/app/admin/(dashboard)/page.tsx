import { KpiSummaryCard } from "@/components/admin/kpi-summary-card";
import { ConsolePage } from "@/components/console/page";
import { prisma } from "@/lib/prisma";

export default async function AdminOverviewPage() {
	const now = new Date();

	const [
		totalUsers,
		usersPendingVerification,
		usersOnboarding,
		usersActive,
		usersInactive,
		usersBanned,
		usersArchived,
		organizersNotApplied,
		organizersPending,
		organizersApproved,
		organizersRejected,
		totalPublishedExperiences,
		experiencesInVerification,
		unlistedExperiences,
		unpublishedExperiences,
		archivedExperiences,
		draftExperiences,
		activeSessionsCount,
		pastSessionsCount,
		activeBookingsCount,
		completedBookingsCount,
		pendingBookingsCount,
		cancelledBookingsCount,
		activeSessionsCapacityAggregate,
		reservedSpotsAggregate,
	] = await Promise.all([
		prisma.user.count(),
		prisma.user.count({ where: { accountStatus: "PENDING_VERIFICATION" } }),
		prisma.user.count({ where: { accountStatus: "ONBOARDING" } }),
		prisma.user.count({ where: { accountStatus: "ACTIVE" } }),
		prisma.user.count({ where: { accountStatus: "INACTIVE" } }),
		prisma.user.count({ where: { accountStatus: "BANNED" } }),
		prisma.user.count({ where: { accountStatus: "ARCHIVED" } }),
		prisma.user.count({ where: { role: "ORGANIZER", organizerStatus: "NOT_APPLIED" } }),
		prisma.user.count({ where: { role: "ORGANIZER", organizerStatus: "PENDING" } }),
		prisma.user.count({ where: { role: "ORGANIZER", organizerStatus: "APPROVED" } }),
		prisma.user.count({ where: { role: "ORGANIZER", organizerStatus: "REJECTED" } }),
		prisma.experience.count({ where: { status: "PUBLISHED" } }),
		prisma.experience.count({ where: { verificationStatus: "PENDING" } }),
		prisma.experience.count({ where: { status: "UNLISTED" } }),
		prisma.experience.count({ where: { status: "UNPUBLISHED" } }),
		prisma.experience.count({ where: { status: "ARCHIVED" } }),
		prisma.experience.count({ where: { status: "DRAFT" } }),
		prisma.experienceSession.count({ where: { startAt: { gte: now } } }),
		prisma.experienceSession.count({ where: { startAt: { lt: now } } }),
		prisma.experienceBooking.count({
			where: { status: "CONFIRMED", session: { startAt: { gte: now } } },
		}),
		prisma.experienceBooking.count({
			where: { status: "CONFIRMED", session: { startAt: { lt: now } } },
		}),
		prisma.experienceBooking.count({ where: { status: "PENDING" } }),
		prisma.experienceBooking.count({ where: { status: "CANCELLED" } }),
		prisma.experienceSession.aggregate({
			where: { startAt: { gte: now } },
			_sum: { capacity: true },
		}),
		prisma.experienceBooking.aggregate({
			where: { status: "CONFIRMED", session: { startAt: { gte: now } } },
			_sum: { guests: true },
		}),
	]);

	const totalCapacityInActiveSessions = activeSessionsCapacityAggregate._sum.capacity ?? 0;
	const reservedSpotsInActiveSessions = reservedSpotsAggregate._sum.guests ?? 0;
	const availableSpotsInActiveSessions = Math.max(totalCapacityInActiveSessions - reservedSpotsInActiveSessions, 0);

	const userSummaryBreakdown = [
		{ label: "Pending verification", value: usersPendingVerification, colorClass: "bg-amber-500" },
		{ label: "Onboarding", value: usersOnboarding, colorClass: "bg-violet-500" },
		{ label: "Active", value: usersActive, colorClass: "bg-sky-500" },
		{ label: "Inactive", value: usersInactive, colorClass: "bg-blue-400" },
		{ label: "Banned", value: usersBanned, colorClass: "bg-rose-500" },
		{ label: "Archived", value: usersArchived, colorClass: "bg-gray-500" },
	];

	const organizerSummaryBreakdown = [
		// { label: "Not applied", value: organizersNotApplied, colorClass: "bg-lime-500" },
		{ label: "Pending", value: organizersPending, colorClass: "bg-amber-600" },
		{ label: "Approved", value: organizersApproved, colorClass: "bg-emerald-500" },
		{ label: "Rejected", value: organizersRejected, colorClass: "bg-rose-500" },
	];
	const organizerSummaryTotal = organizerSummaryBreakdown.reduce((sum, item) => sum + item.value, 0);

	const bookingSummaryBreakdown = [
		{ label: "Active", value: activeBookingsCount, colorClass: "bg-sky-500" },
		{ label: "Pending", value: pendingBookingsCount, colorClass: "bg-amber-500" },
		{ label: "Cancelled", value: cancelledBookingsCount, colorClass: "bg-rose-500" },
		{ label: "Completed", value: completedBookingsCount, colorClass: "bg-indigo-500" },
	];
	const bookingSummaryTotal = bookingSummaryBreakdown.reduce((sum, item) => sum + item.value, 0);

	const experienceHealthBreakdown = [
		{ label: "Draft", value: draftExperiences, colorClass: "bg-amber-500" },
		{ label: "Pending verification", value: experiencesInVerification, colorClass: "bg-indigo-500" },
		{ label: "Unpublished", value: unpublishedExperiences, colorClass: "bg-cyan-500" },
		{ label: "Published", value: totalPublishedExperiences, colorClass: "bg-sky-500" },
		{ label: "Unlisted", value: unlistedExperiences, colorClass: "bg-blue-400" },
		{ label: "Archived", value: archivedExperiences, colorClass: "bg-violet-500" },
	];
	const experienceHealthTotal = experienceHealthBreakdown.reduce((sum, item) => sum + item.value, 0);

	const sessionsBreakdown = [
		{ label: "Active sessions", value: activeSessionsCount, colorClass: "bg-fuchsia-500" },
		{ label: "Past sessions", value: pastSessionsCount, colorClass: "bg-purple-400" },
	];
	const sessionsTotal = sessionsBreakdown.reduce((sum, item) => sum + item.value, 0);

	const spotsBreakdown = [
		{ label: "Reserved spots", value: reservedSpotsInActiveSessions, colorClass: "bg-sky-500" },
		{ label: "Available spots", value: availableSpotsInActiveSessions, colorClass: "bg-emerald-500" },
	];
	const spotsTotal = spotsBreakdown.reduce((sum, item) => sum + item.value, 0);

	return (
		<ConsolePage
			title="Platform health"
			subtitle="Monitor activity across explorers and organizers, track onboarding volume, and keep the marketplace running smoothly."
		>
			<div className="space-y-6">
				<div className="grid gap-6 md:grid-cols-2">
					<KpiSummaryCard
						className="w-full"
						title="User signals"
						description="Accounts by lifecycle status."
						primaryLabel="Users"
						primaryValue={totalUsers}
						breakdown={userSummaryBreakdown}
					/>
					<KpiSummaryCard
						className="w-full"
						title="Organizer pipeline"
						description="Hosts by approval status."
						primaryLabel="Organizers"
						primaryValue={organizerSummaryTotal}
						breakdown={organizerSummaryBreakdown}
					/>
				</div>

				<div className="grid gap-6 md:grid-cols-2">
					<KpiSummaryCard
						title="Experience lifecycle"
						description="Live status of published supply."
						primaryLabel="Experiences"
						primaryValue={experienceHealthTotal}
						breakdown={experienceHealthBreakdown}
					/>
					<KpiSummaryCard
						className="w-full"
						title="Booking pipeline"
						description="Live distribution across reservation states."
						primaryLabel="Bookings"
						primaryValue={bookingSummaryTotal}
						breakdown={bookingSummaryBreakdown}
					/>
				</div>
				<div className="grid gap-6 md:grid-cols-2">
					<KpiSummaryCard
						title="Session cadence"
						description="Upcoming vs past hosted sessions."
						primaryLabel="Sessions"
						primaryValue={sessionsTotal}
						breakdown={sessionsBreakdown}
					/>
					<KpiSummaryCard
						title="Spot readiness"
						description="Seat utilization across active sessions."
						primaryLabel="Spots"
						primaryValue={spotsTotal}
						breakdown={spotsBreakdown}
					/>
				</div>
			</div>
		</ConsolePage>
	);
}
