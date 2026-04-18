/**
 * 경로 트랙 포인트 (웹 `ElevationProfile`의 TrackPoint와 동일 형태).
 */
export type TrackPoint = {
	x: number;
	y: number;
	e?: number;
	d?: number;
};
