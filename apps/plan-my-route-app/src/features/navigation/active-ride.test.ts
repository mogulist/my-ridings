import { describe, expect, test } from "bun:test";

import { buildActiveRide, parseStoredActiveRide } from "./active-ride";

describe("ActiveRide", () => {
	test("라이딩 복원 경로는 선택한 플랜의 일정 화면을 가리킨다", () => {
		const ride = buildActiveRide({
			routeId: "route-1",
			planId: "plan-2",
			routeName: "백두대간",
			planName: "4일 플랜",
		}, "2026-09-17T00:00:00.000Z");

		expect(ride.resumePath).toBe("/routes/route-1/plans/plan-2/schedule");
		expect(ride.startedAt).toBe("2026-09-17T00:00:00.000Z");
	});

	test("다른 플랜의 복원 경로가 저장된 값은 무시한다", () => {
		const stored = JSON.stringify({
			...buildActiveRide(
				{
					routeId: "route-1",
					planId: "plan-2",
					routeName: "백두대간",
					planName: "4일 플랜",
				},
				"2026-09-17T00:00:00.000Z",
			),
			resumePath: "/routes/route-1/plans/plan-3/map",
		});

		expect(parseStoredActiveRide(stored)).toBeNull();
	});
});
