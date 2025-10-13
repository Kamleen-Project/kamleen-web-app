import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_COMMENT_LENGTH = 1500;

export async function POST(request: Request, { params }: { params: Promise<{ experienceId: string }> }) {
	const session = await getServerAuthSession();

	if (!session?.user) {
		return NextResponse.json({ message: "You must be signed in to leave a review." }, { status: 401 });
	}

	if (session.user.activeRole !== "EXPLORER") {
		return NextResponse.json({ message: "Only explorers can leave reviews." }, { status: 403 });
	}

	const { experienceId } = await params;

	if (!experienceId) {
		return NextResponse.json({ message: "Experience not found." }, { status: 404 });
	}

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return NextResponse.json({ message: "Invalid form data." }, { status: 400 });
	}

	const ratingValue = formData.get("rating");
	const commentValue = formData.get("comment");

	const rating = typeof ratingValue === "string" ? Number.parseInt(ratingValue, 10) : Number.NaN;
	if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
		return NextResponse.json({ message: "Rating must be a whole number between 1 and 5." }, { status: 400 });
	}

	const comment = typeof commentValue === "string" ? commentValue.trim() : "";
	if (comment.length > MAX_COMMENT_LENGTH) {
		return NextResponse.json({ message: `Comment must be ${MAX_COMMENT_LENGTH} characters or fewer.` }, { status: 400 });
	}

	const experience = await prisma.experience.findUnique({ where: { id: experienceId }, select: { id: true } });
	if (!experience) {
		return NextResponse.json({ message: "Experience not found." }, { status: 404 });
	}

	try {
		const result = await prisma.$transaction(async (tx) => {
			const existingReview = await tx.experienceReview.findFirst({
				where: {
					experienceId,
					explorerId: session.user.id,
				},
			});

			const review = existingReview
				? await tx.experienceReview.update({
					where: { id: existingReview.id },
					data: {
						rating,
						comment: comment.length ? comment : null,
					},
				})
				: await tx.experienceReview.create({
					data: {
						experienceId,
						explorerId: session.user.id,
						rating,
						comment: comment.length ? comment : null,
					},
				});

			const aggregates = await tx.experienceReview.aggregate({
				where: { experienceId },
				_avg: { rating: true },
				_count: { _all: true },
			});

			await tx.experience.update({
				where: { id: experienceId },
				data: {
					averageRating: aggregates._avg.rating ?? 0,
					reviewCount: aggregates._count._all,
				},
			});

			return review;
		});

		return NextResponse.json({ ok: true, reviewId: result.id });
	} catch (error) {
		console.error("Failed to submit review", error);
		return NextResponse.json({ message: "Unable to submit review" }, { status: 500 });
	}
}

