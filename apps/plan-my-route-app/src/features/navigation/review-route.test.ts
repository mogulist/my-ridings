import { describe, expect, test } from "bun:test";

import { normalizePlanReviewRoute } from "./review-route";

describe("normalizePlanReviewRoute", () => {
	test.each(["summary", "schedule", "map"])("%s 탭을 복원 경로로 허용한다", (screen) => {
		expect(normalizePlanReviewRoute(`/routes/route-1/plans/plan-2/${screen}/`)).toBe(
			`/routes/route-1/plans/plan-2/${screen}`,
		);
	});

	test("특정 일차의 상세 화면을 허용한다", () => {
		expect(normalizePlanReviewRoute("/routes/route-1/plans/plan-2/stages/3")).toBe(
			"/routes/route-1/plans/plan-2/stages/3",
		);
	});

	test.each([
		"/",
		"/routes/route-1/plans",
		"/routes/route-1/plans/plan-2/stages/0",
		"/routes/route-1/plans/plan-2/stages/3/edit",
		"/routes/route-1/plans/plan-2/weather",
	])("검토 화면이 아닌 %s 경로는 저장하지 않는다", (pathname) => {
		expect(normalizePlanReviewRoute(pathname)).toBeNull();
	});
});
