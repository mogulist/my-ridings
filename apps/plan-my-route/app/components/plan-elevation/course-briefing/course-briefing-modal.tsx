"use client";

import { RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { TrackPoint } from "@my-ridings/plan-geometry";
import type { Stage } from "@/app/types/plan";
import type { BriefingElevationSource, RouteOfficialSpecs } from "@/app/types/route";
import {
	applyBriefingDisplayOverrides,
	canToggleBriefingElevationSource,
	defaultBriefingElevationSource,
} from "@/lib/route-official-specs";
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
	routeOfficialSpecs?: RouteOfficialSpecs | null;
};

type BriefingElevationPillProps = {
	source: BriefingElevationSource;
	measuredGainM: number;
	officialGainM: number;
	onSourceChange: (source: BriefingElevationSource) => void;
};

function BriefingElevationPill({
	source,
	measuredGainM,
	officialGainM,
	onSourceChange,
}: BriefingElevationPillProps) {
	const formatGain = (value: number) => value.toLocaleString("ko-KR");

	return (
		<div
			className="flex rounded-full bg-black/45 p-0.5 text-xs font-medium text-white"
			role="group"
			aria-label="획득고도 표시"
		>
			<button
				type="button"
				onClick={() => onSourceChange("official")}
				className={`rounded-full px-3 py-1.5 transition-colors ${
					source === "official" ? "bg-white/20" : "hover:bg-white/10"
				}`}
				aria-pressed={source === "official"}
			>
				공식 {formatGain(officialGainM)} m
			</button>
			<button
				type="button"
				onClick={() => onSourceChange("measured")}
				className={`rounded-full px-3 py-1.5 transition-colors ${
					source === "measured" ? "bg-white/20" : "hover:bg-white/10"
				}`}
				aria-pressed={source === "measured"}
			>
				실측 {formatGain(measuredGainM)} m
			</button>
		</div>
	);
}

export function CourseBriefingModal({
	open,
	onClose,
	trackPoints,
	summitMarkers,
	stages,
	selectedDayNumber,
	totalKm,
	elevationCalibratedThreshold,
	routeOfficialSpecs,
}: CourseBriefingModalProps) {
	const isFullRoute = selectedDayNumber == null;
	const [elevationSource, setElevationSource] = useState<BriefingElevationSource>("measured");

	const baseGeometry = useMemo(
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

	const showElevationToggle = canToggleBriefingElevationSource(
		routeOfficialSpecs,
		isFullRoute,
	);

	const displayGeometry = useMemo(() => {
		if (!baseGeometry) return null;
		return applyBriefingDisplayOverrides(
			baseGeometry,
			routeOfficialSpecs,
			elevationSource,
			isFullRoute,
		);
	}, [baseGeometry, routeOfficialSpecs, elevationSource, isFullRoute]);

	useEffect(() => {
		if (!open) return;
		setElevationSource(defaultBriefingElevationSource(routeOfficialSpecs));
	}, [open, routeOfficialSpecs]);

	const { progress, replay } = useCourseBriefingProgress(open && displayGeometry != null);

	useEffect(() => {
		if (!open) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [open, onClose]);

	if (!open) return null;

	const measuredGainM = baseGeometry?.elevationGainM ?? 0;
	const officialGainM = routeOfficialSpecs?.officialElevationM ?? measuredGainM;

	return (
		<div
			className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
			onClick={onClose}
		>
			<div
				className="relative aspect-video w-full max-w-[min(96vw,calc(96vh*16/9))] overflow-hidden rounded-lg shadow-2xl"
				onClick={(event) => event.stopPropagation()}
			>
				{displayGeometry ? (
					<CourseBriefingCanvas geometry={displayGeometry} progress={progress} />
				) : (
					<div className="flex h-full w-full items-center justify-center bg-[#0B1220] text-lg text-white">
						고도 데이터가 없어 브리핑을 표시할 수 없습니다.
					</div>
				)}

				<div className="absolute right-3 top-3 flex items-center gap-2">
					{showElevationToggle && baseGeometry ? (
						<BriefingElevationPill
							source={elevationSource}
							measuredGainM={measuredGainM}
							officialGainM={officialGainM}
							onSourceChange={setElevationSource}
						/>
					) : null}
					{displayGeometry ? (
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
