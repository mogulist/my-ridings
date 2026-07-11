import { describe, expect, it } from "bun:test";
import type { Stage } from "@/app/types/plan";
import type { TrackPoint } from "@my-ridings/plan-geometry";
import { buildChartData, sampleProfilePoints } from "./enrich-chart-data";
import { fromTrackPoints } from "@my-ridings/elevation-profile";

const trackPoints: TrackPoint[] = [
	{ x: 127.0, y: 37.0, e: 100, d: 0 },
	{ x: 127.0, y: 37.0 },
	{ x: 127.1, y: 37.1, e: 200, d: 5000 },
	{ x: 127.2, y: 37.2, e: 300, d: 10000 },
	{ x: 127.3, y: 37.3, e: 400, d: 15000 },
];

const stages: Stage[] = [
	{
		id: "s1",
		dayNumber: 1,
		distanceKm: 10,
		startDistanceKm: 0,
		endDistanceKm: 10,
		elevationGain: 200,
		elevationLoss: 0,
		isLastStage: false,
	},
];

describe("buildChartData", () => {
	it("preserves original trackPoints index in ChartDatum.index", () => {
		const data = buildChartData(trackPoints, stages, undefined, 10);
		expect(data.some((d) => d.index === 2)).toBe(true);
		expect(data.every((d) => trackPoints[d.index]?.e != null)).toBe(true);
	});

	it("includes stage boundary distances when downsampling", () => {
		const manyPoints: TrackPoint[] = Array.from({ length: 100 }, (_, i) => ({
			x: 127 + i * 0.001,
			y: 37,
			e: 100 + i,
			d: i * 1000,
		}));
		const longStages: Stage[] = [
			{
				id: "s1",
				dayNumber: 1,
				distanceKm: 50,
				startDistanceKm: 0,
				endDistanceKm: 50,
				elevationGain: 50,
				elevationLoss: 0,
				isLastStage: true,
			},
		];
		const data = buildChartData(manyPoints, longStages, undefined, 20);
		const distances = data.map((d) => d.distanceKm);
		expect(distances.some((km) => km === 0)).toBe(true);
		expect(distances.some((km) => km === 50)).toBe(true);
	});
});

describe("sampleProfilePoints", () => {
	it("keeps stage end index when downsampling", () => {
		const profile = fromTrackPoints(
			Array.from({ length: 80 }, (_, i) => ({
				x: 127,
				y: 37,
				e: 100 + i,
				d: i * 1000,
			})),
			80,
		);
		const sampled = sampleProfilePoints(profile, stages, 10);
		expect(sampled.some((p) => p.distanceKm === 10)).toBe(true);
	});
});
