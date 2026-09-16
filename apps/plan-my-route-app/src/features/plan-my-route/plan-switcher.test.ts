import { describe, expect, test } from "bun:test";

import { buildPlanSwitchOptions } from "./plan-switcher";

describe("buildPlanSwitchOptions", () => {
	test("우선순위와 현재·라이딩 플랜 상태를 표시한다", () => {
		const options = buildPlanSwitchOptions(
			[
				{ id: "a", name: "150km 안" },
				{ id: "b", name: "200km 안" },
				{ id: "c", name: "230km 안" },
			],
			"b",
			"c",
		);

		expect(options).toEqual([
			{ planId: "a", label: "1순위 · 150km 안" },
			{ planId: "b", label: "2순위 · 200km 안 · 현재" },
			{ planId: "c", label: "3순위 · 230km 안 · 라이딩 플랜" },
		]);
	});
});
