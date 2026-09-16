import { describe, expect, test } from "bun:test";

import { sortRoutesNewestFirst } from "./route-sort";

describe("sortRoutesNewestFirst", () => {
	test("생성 시각이 최신인 라우트부터 정렬한다", () => {
		const routes = [
			{ id: "old", name: "old", created_at: "2026-01-01T00:00:00Z" },
			{ id: "new", name: "new", created_at: "2026-09-01T00:00:00Z" },
			{ id: "middle", name: "middle", created_at: "2026-05-01T00:00:00Z" },
		];

		expect(sortRoutesNewestFirst(routes).map((route) => route.id)).toEqual([
			"new",
			"middle",
			"old",
		]);
		expect(routes.map((route) => route.id)).toEqual(["old", "new", "middle"]);
	});

	test("생성 시각이 없는 라우트는 뒤에 둔다", () => {
		const routes = [
			{ id: "unknown", name: "unknown" },
			{ id: "known", name: "known", created_at: "2026-09-01T00:00:00Z" },
		];

		expect(sortRoutesNewestFirst(routes).map((route) => route.id)).toEqual(["known", "unknown"]);
	});
});
