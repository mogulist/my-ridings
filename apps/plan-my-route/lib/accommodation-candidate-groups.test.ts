import { describe, expect, test } from "bun:test";
import { groupAccommodationCandidates } from "./accommodation-candidate-groups";

describe("groupAccommodationCandidates", () => {
	test("5km 이상 떨어진 숙소를 다음 선택지로 분리한다", () => {
		const groups = groupAccommodationCandidates([
			{ id: "seongsan", distanceKm: 210.8, sortOrder: null },
			{ id: "lapine", distanceKm: 210.8, sortOrder: null },
			{ id: "ibubaba", distanceKm: 220.8, sortOrder: null },
			{ id: "haepumdal", distanceKm: 221.2, sortOrder: null },
			{ id: "last", distanceKm: 230, sortOrder: null },
		]);

		expect(groups.map((group) => group.items.map((item) => item.id))).toEqual([
			["lapine", "seongsan"],
			["ibubaba", "haepumdal"],
			["last"],
		]);
		expect(groups.map((group) => group.additionalDistanceKm)).toEqual([null, 10, 9.2]);
	});

	test("사용자 우선순위는 같은 거리 군집 안에서만 적용한다", () => {
		const groups = groupAccommodationCandidates([
			{ id: "near-second", distanceKm: 210.8, sortOrder: 1 },
			{ id: "near-first", distanceKm: 211.1, sortOrder: 0 },
			{ id: "far-first", distanceKm: 220.8, sortOrder: 0 },
		]);

		expect(groups.map((group) => group.items.map((item) => item.id))).toEqual([
			["near-first", "near-second"],
			["far-first"],
		]);
	});
});
