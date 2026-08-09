import { describe, expect, test } from "bun:test";
import type { TrackPoint } from "@my-ridings/plan-geometry";
import type { Stage } from "@/app/types/plan";
import {
	buildBriefingGeometry,
	resolveBriefingRange,
} from "./build-briefing-geometry";

function makeTrack(): TrackPoint[] {
	const points: TrackPoint[] = [];
	for (let i = 0; i <= 100; i++) {
		points.push({
			d: i * 1000,
			e: 100 + Math.sin(i / 10) * 50 + i * 2,
			x: 127,
			y: 37,
		});
	}
	return points;
}

const stages: Stage[] = [
	{
		id: "s1",
		dayNumber: 1,
		distanceKm: 50,
		startDistanceKm: 0,
		endDistanceKm: 50,
		elevationGain: 500,
		elevationLoss: 200,
		isLastStage: false,
		startName: "출발지",
		endName: "중간",
	},
	{
		id: "s2",
		dayNumber: 2,
		distanceKm: 50,
		startDistanceKm: 50,
		endDistanceKm: 100,
		elevationGain: 400,
		elevationLoss: 300,
		isLastStage: true,
		startName: "중간",
		endName: "도착지",
	},
];

describe("buildBriefingGeometry", () => {
	test("전체 구간 geometry 생성", () => {
		const track = makeTrack();
		const geometry = buildBriefingGeometry({
			trackPoints: track,
			summitMarkers: [
				{
					id: "summit-1",
					passIndex: 0,
					name: "테스트고개",
					distanceKm: 25,
					elevation: 300,
					trackPointIndex: 25,
				},
			],
			stages,
			selectedDayNumber: null,
			totalKm: 100,
		});

		expect(geometry).not.toBeNull();
		expect(geometry?.startName).toBe("출발지");
		expect(geometry?.endName).toBe("도착지");
		expect(geometry?.totalDistanceKm).toBe(100);
		expect(geometry?.areaPath.length).toBeGreaterThan(0);
		expect(geometry?.summits.length).toBe(1);
	});

	test("선택 일차 구간 geometry 생성", () => {
		const range = resolveBriefingRange(stages, 2, 100);
		expect(range.startKm).toBe(50);
		expect(range.endKm).toBe(100);
		expect(range.startName).toBe("중간");
		expect(range.endName).toBe("도착지");

		const geometry = buildBriefingGeometry({
			trackPoints: makeTrack(),
			summitMarkers: [],
			stages,
			selectedDayNumber: 2,
			totalKm: 100,
		});

		expect(geometry?.totalDistanceKm).toBe(50);
	});

	test("스테이지 이름 없을 때 Start / Finish 기본값", () => {
		const range = resolveBriefingRange([], null, 100);
		expect(range.startName).toBe("Start");
		expect(range.endName).toBe("Finish");
	});

	test("가까운 서밋은 여러 층 labelRow 배치", () => {
		const geometry = buildBriefingGeometry({
			trackPoints: makeTrack(),
			summitMarkers: [
				{
					id: "a",
					passIndex: 0,
					name: "갈마치고개",
					distanceKm: 20,
					elevation: 240,
					trackPointIndex: 20,
				},
				{
					id: "b",
					passIndex: 0,
					name: "곤등고개",
					distanceKm: 22,
					elevation: 270,
					trackPointIndex: 22,
				},
				{
					id: "c",
					passIndex: 0,
					name: "돌고개",
					distanceKm: 24,
					elevation: 130,
					trackPointIndex: 24,
				},
			],
			stages: [],
			selectedDayNumber: null,
			totalKm: 100,
		});

		const rows = geometry?.summits.map((s) => s.labelRow) ?? [];
		expect(new Set(rows).size).toBeGreaterThan(1);
	});
});
