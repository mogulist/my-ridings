import { haversineKm } from "./along-route";

/**
 * 중기예보 육상(`getMidLandFcst`)·기온(`getMidTa`) regId 쌍과 대표 좌표.
 * 격자 중심점에서 유클리드 근사(haversine)로 최근접 구역을 고른다.
 *
 * 코드는 공공데이터포털 「중기예보 조회서비스」 활용가이드 별첨과 교차검증할 것.
 * 세부 번호가 API와 맞지 않으면 해당 항목만 수정하면 된다.
 */
export type MidRegionCentroid = {
	label: string;
	lat: number;
	lng: number;
	/** getMidLandFcst `regId` */
	land: string;
	/** getMidTa `regId` */
	temp: string;
};

export const MID_REGION_CENTROIDS: MidRegionCentroid[] = [
	{ label: "수도권", lat: 37.5665, lng: 126.978, land: "11B00000", temp: "11B10101" },
	{ label: "강원영서", lat: 37.8813, lng: 127.7298, land: "11D10000", temp: "11D10301" },
	{ label: "강원영동", lat: 37.7519, lng: 128.8761, land: "11D20000", temp: "11D20501" },
	{ label: "충북", lat: 36.6424, lng: 127.489, land: "11C10000", temp: "11C10101" },
	{ label: "충남·대전·세종", lat: 36.3504, lng: 127.3845, land: "11C20000", temp: "11C20401" },
	{ label: "전북", lat: 35.8242, lng: 127.148, land: "11F10000", temp: "11F10201" },
	{ label: "전남·광주", lat: 35.1595, lng: 126.8526, land: "11F20000", temp: "11F20401" },
	{ label: "경북·대구", lat: 35.8714, lng: 128.6014, land: "11H10000", temp: "11H10701" },
	{ label: "경남·울산·부산", lat: 35.1796, lng: 129.0756, land: "11H20000", temp: "11H20201" },
	{ label: "제주", lat: 33.4996, lng: 126.5312, land: "11G00000", temp: "11G00201" },
];

export const nearestMidRegionCodes = (lat: number, lng: number): { land: string; temp: string } => {
	let best = MID_REGION_CENTROIDS[0];
	let bestKm = Number.POSITIVE_INFINITY;
	for (const c of MID_REGION_CENTROIDS) {
		const km = haversineKm([lat, lng], [c.lat, c.lng]);
		if (km < bestKm) {
			bestKm = km;
			best = c;
		}
	}
	return { land: best.land, temp: best.temp };
};
