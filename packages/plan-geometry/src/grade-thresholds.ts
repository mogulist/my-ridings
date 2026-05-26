/** Wahoo ELEMNT Summit 경사도 색상 구간 (%) */
export type GradeBand = "descent" | "green" | "yellow" | "orange" | "red" | "extreme";

export const WAHOO_GRADE_SEGMENT_LENGTH_M = 10;

/** Wahoo 공식 색상 (ELEMNT Summit grade categorization) */
export const WAHOO_GRADE_COLORS: Record<GradeBand, string> = {
	descent: "#9CA3AF",
	green: "#22C55E",
	yellow: "#EAB308",
	orange: "#F97316",
	red: "#EF4444",
	extreme: "#7C2D12",
};

export const WAHOO_GRADE_LABELS_KO: Record<GradeBand, string> = {
	descent: "하강",
	green: "0–3.9%",
	yellow: "4–7.9%",
	orange: "8–11.9%",
	red: "12–19.9%",
	extreme: "20%+",
};

/** 경사(%) → Wahoo 색상 구간 */
export function gradeBandForPercent(gradePercent: number): GradeBand {
	if (gradePercent < 0) return "descent";
	if (gradePercent < 4) return "green";
	if (gradePercent < 8) return "yellow";
	if (gradePercent < 12) return "orange";
	if (gradePercent < 20) return "red";
	return "extreme";
}

/** Wahoo: 평균 경사 < 3% 또는 길이 < 250m 이면 클라임 아님 */
export const WAHOO_CLIMB_MIN_LENGTH_M = 250;
export const WAHOO_CLIMB_MIN_AVG_GRADE_PERCENT = 3;
export const WAHOO_CLIMB_LONG_LENGTH_M = 400;
export const WAHOO_CLIMB_STEEP_MIN_AVG_GRADE_PERCENT = 7;

/**
 * 길이(m)에 따른 Wahoo 최소 평균 경사(%).
 * 250m→7%, 400m→3% 선형 보간, 400m 이상 3%.
 */
export function wahooMinAvgGradeForLength(lengthM: number): number {
	if (lengthM < WAHOO_CLIMB_MIN_LENGTH_M) return Infinity;
	if (lengthM >= WAHOO_CLIMB_LONG_LENGTH_M) return WAHOO_CLIMB_MIN_AVG_GRADE_PERCENT;
	const t =
		(lengthM - WAHOO_CLIMB_MIN_LENGTH_M) /
		(WAHOO_CLIMB_LONG_LENGTH_M - WAHOO_CLIMB_MIN_LENGTH_M);
	return (
		WAHOO_CLIMB_STEEP_MIN_AVG_GRADE_PERCENT +
		t * (WAHOO_CLIMB_MIN_AVG_GRADE_PERCENT - WAHOO_CLIMB_STEEP_MIN_AVG_GRADE_PERCENT)
	);
}

/** Wahoo 클라임 인정 여부 */
export function isWahooClimb(lengthM: number, avgGradePercent: number): boolean {
	if (lengthM < WAHOO_CLIMB_MIN_LENGTH_M) return false;
	if (avgGradePercent < WAHOO_CLIMB_MIN_AVG_GRADE_PERCENT) return false;
	return avgGradePercent >= wahooMinAvgGradeForLength(lengthM);
}
