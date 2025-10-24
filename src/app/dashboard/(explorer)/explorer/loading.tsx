import BalloonLoading from "@/components/ui/balloon-loading";

export default function Loading() {
	return (
		<div className="flex min-h-[60vh] items-center justify-center">
			<BalloonLoading size="md" color="gray" label="Loading explorer console" />
		</div>
	);
}
