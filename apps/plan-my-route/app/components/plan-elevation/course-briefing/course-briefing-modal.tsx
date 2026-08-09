"use client";

import { RotateCcw, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import type { TrackPoint } from "@my-ridings/plan-geometry";
import type { Stage } from "@/app/types/plan";
import type { SummitOnRoute } from "../types";
import { buildBriefingGeometry } from "./build-briefing-geometry";
import { CourseBriefingCanvas } from "./course-briefing-canvas";
import { useCourseBriefingProgress } from "./use-course-briefing-progress";

type CourseBriefingModalProps = {
	open: boolean;
	onClose: () => void;
	trackPoints: TrackPoint[];
	summitMarkers: SummitOnRoute[];
	stages: Stage[];
	selectedDayNumber: number | null;
	totalKm: number;
	elevationCalibratedThreshold?: number;
};

export function CourseBriefingModal({
	open,
	onClose,
	trackPoints,
	summitMarkers,
	stages,
	selectedDayNumber,
	totalKm,
	elevationCalibratedThreshold,
}: CourseBriefingModalProps) {
	const geometry = useMemo(
		() =>
			open
				? buildBriefingGeometry({
						trackPoints,
						summitMarkers,
						stages,
						selectedDayNumber,
						totalKm,
						elevationCalibratedThreshold,
					})
				: null,
		[
			open,
			trackPoints,
			summitMarkers,
			stages,
			selectedDayNumber,
			totalKm,
			elevationCalibratedThreshold,
		],
	);

	const { progress, replay } = useCourseBriefingProgress(open && geometry != null);

	useEffect(() => {
		if (!open) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [open, onClose]);

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
			onClick={onClose}
		>
			<div
				className="relative aspect-video w-full max-w-[min(96vw,calc(96vh*16/9))] overflow-hidden rounded-lg shadow-2xl"
				onClick={(event) => event.stopPropagation()}
			>
				{geometry ? (
					<CourseBriefingCanvas geometry={geometry} progress={progress} />
				) : (
					<div className="flex h-full w-full items-center justify-center bg-[#0B1220] text-lg text-white">
						고도 데이터가 없어 브리핑을 표시할 수 없습니다.
					</div>
				)}

				<div className="absolute right-3 top-3 flex items-center gap-2">
					{geometry ? (
						<button
							type="button"
							onClick={replay}
							className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/65"
							aria-label="다시 재생"
						>
							<RotateCcw className="h-4 w-4" />
						</button>
					) : null}
					<button
						type="button"
						onClick={onClose}
						className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/65"
						aria-label="닫기"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			</div>
		</div>
	);
}
