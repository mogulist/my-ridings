import type { TrackPoint } from "@my-ridings/plan-geometry";
import type { PendingStageEdit } from "@/app/hooks/usePlanStages";
import type { Stage } from "@/app/types/plan";
import type { RouteOfficialSpecs } from "@/app/types/route";

export type { TrackPoint };

export type CPOnRoute = {
	id: number;
	name: string;
	distanceKm: number;
	elevation: number;
	trackPointIndex: number;
};

export type SummitOnRoute = {
	id: string;
	passIndex: number;
	name: string;
	distanceKm: number;
	elevation: number;
	trackPointIndex: number;
};

export type ElevationScheduleMarkerFocus =
	| { kind: "cp"; id: number }
	| { kind: "summit"; id: string; passIndex: number }
	| {
			kind: "plan_poi";
			id: string;
			distanceKm: number;
			name: string;
			elevationM: number;
			categoryLabel: string;
	  };

export type PreviewStageStats = {
	distanceKm: number;
	elevationGain: number;
	elevationLoss: number;
};

export type ElevationProfileProps = {
	trackPoints: TrackPoint[];
	/** 스테이지 종료 탐색 중 차트가 집중해서 보여줄 누적 거리 구간 */
	explorationRangeKm?: { startKm: number; endKm: number } | null;
	/** 탐색 중 비교하는 가상 종료 지점 */
	explorationCandidates?: {
		id: string;
		label: string;
		distanceKm: number;
		selected?: boolean;
	}[];
	positionIndex?: number | null;
	onPositionChange?: (index: number | null) => void;
	stages?: Stage[];
	activeStageId?: string | null;
	selectedDayNumber?: number | null;
	onSelectedDayChange?: (day: number | null) => void;
	pendingStageEdit?: PendingStageEdit | null;
	previewStageStats?: PreviewStageStats | null;
	onStartBoundaryDrag?: (stageId: string, originalEndKm: number) => void;
	onPreviewMove?: (stageId: string, previewEndKm: number) => void;
	onCommitPreview?: () => void;
	onDiscardPreview?: () => void;
	isPinned?: boolean;
	onPin?: (index: number) => void;
	onUnpin?: () => void;
	elevationCalibratedThreshold?: number;
	routeOfficialSpecs?: RouteOfficialSpecs | null;
	cpMarkers?: CPOnRoute[];
	summitMarkers?: SummitOnRoute[];
	alwaysShowChips?: boolean;
	hideChips?: boolean;
	chartHeightPx?: number;
	compactYAxis?: boolean;
	disablePinAndHoverScrub?: boolean;
	compactTooltip?: boolean;
	singleScheduleMarkerLabel?: boolean;
	scheduleMarkerFocus?: ElevationScheduleMarkerFocus | null;
	labelLayout?: "single" | "stagger";
	onStageEndBoundaryEditMapCenter?: (distanceKm: number) => void;
	stageEndBoundaryChartEditMode?: boolean;
	onExitStageEndBoundaryChartEditMode?: () => void;
};
