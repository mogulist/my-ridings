import { useEffect, useState } from "react";

export const COURSE_BRIEFING_DURATION_MS = 7000;

export function useCourseBriefingProgress(isActive: boolean) {
	const [progress, setProgress] = useState(0);
	const [runId, setRunId] = useState(0);

	const replay = () => {
		setProgress(0);
		setRunId((id) => id + 1);
	};

	useEffect(() => {
		if (!isActive) {
			setProgress(0);
			return;
		}

		let startTime: number | null = null;
		let rafId = 0;

		const tick = (now: number) => {
			if (startTime === null) startTime = now;
			const elapsed = now - startTime;
			const nextProgress = Math.min(1, elapsed / COURSE_BRIEFING_DURATION_MS);
			setProgress(nextProgress);
			if (nextProgress < 1) {
				rafId = requestAnimationFrame(tick);
			}
		};

		setProgress(0);
		rafId = requestAnimationFrame(tick);

		return () => cancelAnimationFrame(rafId);
	}, [isActive, runId]);

	return {
		progress,
		replay,
		isComplete: progress >= 1,
	};
}
