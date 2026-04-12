export type StageScheduleMarkerKind = "cp" | "summit" | "plan_poi";

export type StageScheduleWaypoint = {
	rowKey: string;
	name: string;
	/** 경로 전체 기준 누적 거리(km) — 정렬·누적상승 계산용 */
	distanceAlongRouteKm: number;
	/** 해당 일차 시작점부터의 거리(km) — 표시용 */
	distanceFromStageStartKm: number;
	/** 해당 지점 해발 고도(m) — 트랙/스냅 또는 정상 카탈로그 */
	elevationM: number;
	/** 일차 시작 지점부터 이 지점까지 구간 누적 상승고도(m) */
	elevationGainFromStageStartM: number;
	categoryLabel: string;
	memo: string | null;
	markerKind: StageScheduleMarkerKind;
	/** `markerKind === "plan_poi"` 일 때 — 지도 `NEARBY_CATEGORY_LUCIDE_ICON_NODES` 와 동일 분기 */
	planPoiType?: string;
	/** `markerKind === "plan_poi"` 일 때 — 클릭·포커스용 */
	planPoiId?: string;
};
