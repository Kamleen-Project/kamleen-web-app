import { useEffect, useRef, useState } from "react";

type UseCountdownOptions = {
	onExpire?: () => void;
	tickMs?: number;
};

function computeRemaining(targetIso?: string | null) {
	if (!targetIso) return 0;
	const targetTime = new Date(targetIso).getTime();
	if (!Number.isFinite(targetTime)) return 0;
	return Math.max(0, targetTime - Date.now());
}

export function useCountdown(targetIso?: string | null, options?: UseCountdownOptions) {
	const { onExpire, tickMs = 1000 } = options ?? {};
	const [remainingMs, setRemainingMs] = useState(() => computeRemaining(targetIso));
	const expireCalledRef = useRef(false);

	useEffect(() => {
		expireCalledRef.current = false;
		if (!targetIso) {
			setRemainingMs(0);
			return;
		}

		const update = () => {
			const next = computeRemaining(targetIso);
			setRemainingMs(next);
			if (next === 0 && onExpire && !expireCalledRef.current) {
				expireCalledRef.current = true;
				onExpire();
			}
		};

		update();
		const interval = window.setInterval(update, tickMs);
		return () => window.clearInterval(interval);
	}, [targetIso, tickMs, onExpire]);

	const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	const formatted = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

	return {
		remainingMs,
		formatted,
		isExpired: !targetIso || remainingMs <= 0,
	};
}

