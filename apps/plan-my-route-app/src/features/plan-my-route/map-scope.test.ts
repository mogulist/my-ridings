import { expect, test } from "bun:test";
import { clipMapTrack, getMapScope, mapMarkerPoint } from "./map-scope";
import { MAP_PREVIEW_DETAIL as detail } from "./map-preview-data";
test("a selected stage excludes distant tracks and markers, retaining endpoints", () => {
	const scope = getMapScope(detail, "stage-1");
	expect(scope.track[0].d).toBe(10000);
	expect(scope.track.at(-1)?.d).toBe(20000);
	expect(scope.cps.map((p) => p.id)).toEqual([2]);
	expect(scope.summits).toEqual([]);
	expect(getMapScope(detail).track.length).toBe(301);
	expect(getMapScope(detail, "deleted-stage").cps.length).toBe(2);
});
test("interpolates boundaries even when no raw point falls on them", () => {
	const track = [
		{ x: 127, y: 37, d: 0 },
		{ x: 128, y: 38, d: 10000 },
	];
	expect(clipMapTrack(track, 2500, 7500)).toEqual([
		{ x: 127.25, y: 37.25, d: 2500 },
		{ x: 127.75, y: 37.75, d: 7500 },
	]);
	expect(clipMapTrack(track, 5, 4)).toEqual([]);
});
test("POI ownership wins and distance POIs do not require altitude", () => {
	const p = { id: "p", assignment_mode: "stage", stage_id: "stage-1", lat: 37, lng: 127 } as any;
	const d = {
		...detail,
		planPois: [
			p,
			{ ...p, id: "other", stage_id: "stage-2" },
			{ ...p, id: "all", assignment_mode: "plan" },
			{
				...p,
				id: "distance",
				assignment_mode: "distance",
				lat: detail.trackPoints[150].y,
				lng: detail.trackPoints[150].x,
			},
		],
		trackPoints: detail.trackPoints.map((p) => ({ ...p, e: undefined })),
	};
	expect(getMapScope(d, "stage-1").pois.map((p) => p.id)).toEqual(["p", "distance"]);
});

test("marker placement uses route distance despite stale original track indices", () => {
	expect(
		mapMarkerPoint(
			[
				{ x: 127, y: 37, d: 0 },
				{ x: 127.1, y: 37, d: 10000 },
			],
			10,
		)?.x,
	).toBe(127.1);
	expect(mapMarkerPoint([], 10)).toBeNull();
});
