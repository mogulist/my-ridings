"use client";

import { useEffect, useState } from "react";
import { ElevationProfile } from "./ElevationProfile";
import type { RideWithGPSRoute, TrackPoint } from "./KakaoMap";

const ROUTE_ID = "52263710";

export default function ElevationProfileSection() {
	const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);

	useEffect(() => {
		let cancelled = false;
		fetch(`/api/ridewithgps?routeId=${ROUTE_ID}`)
			.then((res) => res.json() as Promise<RideWithGPSRoute>)
			.then((data) => {
				if (!cancelled) setTrackPoints(data.track_points);
			})
			.catch(console.error);
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<ElevationProfile
			trackPoints={trackPoints}
			// positionIndex와 onPositionChange는 지도 연동 시 추가 예정
		/>
	);
}
