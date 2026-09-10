import { useEffect, useState } from "react";

export const COURSE_BRIEFING_DURATION_MS = 7000;
/** Play 직후 애니메이션 시작까지 대기 (맵·고도 브리핑 공통) */
export const COURSE_BRIEFING_START_DELAY_MS = 1000;

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
		let delayTimeoutId = 0;

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
		delayTimeoutId = window.setTimeout(() => {
			rafId = requestAnimationFrame(tick);
		}, COURSE_BRIEFING_START_DELAY_MS);

		return () => {
			window.clearTimeout(delayTimeoutId);
			cancelAnimationFrame(rafId);
		};
	}, [isActive, runId]);

	return {
		progress,
		replay,
		isComplete: progress >= 1,
	};
}
