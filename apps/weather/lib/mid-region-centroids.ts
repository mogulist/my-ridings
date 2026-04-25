import { haversineKm } from "./along-route";

/**
 * 중기예보 육상(`getMidLandFcst`)·기온(`getMidTa`) regId 쌍과 대표 좌표.
 * 격자 중심점에서 haversine 최근접으로 구역을 고른다.
 *
 * land: getMidLandFcst 광역코드 (11D10000=강원영서, 11D20000=강원영동 등)
 * temp: getMidTa 도시코드 — 기상청 동네예보통보문조회서비스 지점목록 기준.
 *       코드가 getMidTa API에서 유효하지 않으면 ingest 시 에러로 skip되므로
 *       지점목록과 실제 API 지원 여부를 교차검증할 것.
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
	// 수도권 (11B00000)
	{ label: "서울·경기북부", lat: 37.5665, lng: 126.978, land: "11B00000", temp: "11B10101" }, // 서울
	{ label: "수원·경기남부", lat: 37.265, lng: 127.009, land: "11B00000", temp: "11B20601" }, // 수원

	// 강원영서 (11D10000)
	{ label: "춘천·강원영서북부", lat: 37.881, lng: 127.730, land: "11D10000", temp: "11D10301" }, // 춘천
	{ label: "원주·강원영서남부", lat: 37.342, lng: 127.921, land: "11D10000", temp: "11D10401" }, // 원주
	// 정선·영월·평창 등 경도 128°대 영서 내륙 커버
	{ label: "정선·강원영서산악", lat: 37.374, lng: 128.657, land: "11D10000", temp: "11D10502" }, // 정선

	// 강원영동 (11D20000)
	{ label: "속초·강원영동북부", lat: 38.208, lng: 128.591, land: "11D20000", temp: "11D20401" }, // 속초
	{ label: "강릉·강원영동중부", lat: 37.752, lng: 128.879, land: "11D20000", temp: "11D20501" }, // 강릉
	{ label: "삼척·강원영동남부", lat: 37.452, lng: 129.166, land: "11D20000", temp: "11D20602" }, // 삼척

	// 충북 (11C10000)
	{ label: "충주·충북북부", lat: 36.991, lng: 127.925, land: "11C10000", temp: "11C10101" }, // 충주
	{ label: "청주·충북남부", lat: 36.642, lng: 127.489, land: "11C10000", temp: "11C10301" }, // 청주

	// 충남·대전·세종 (11C20000)
	{ label: "서산·충남서부", lat: 36.784, lng: 126.450, land: "11C20000", temp: "11C20101" }, // 서산
	{ label: "대전·충남동부", lat: 36.350, lng: 127.384, land: "11C20000", temp: "11C20401" }, // 대전

	// 전북 (11F10000)
	{ label: "전주·전북", lat: 35.824, lng: 127.148, land: "11F10000", temp: "11F10201" }, // 전주

	// 전남·광주 (11F20000)
	{ label: "광주·전남내륙", lat: 35.160, lng: 126.852, land: "11F20000", temp: "11F20501" }, // 광주
	{ label: "여수·전남동부", lat: 34.760, lng: 127.662, land: "11F20000", temp: "11F20401" }, // 여수

	// 경북·대구 (11H10000)
	{ label: "안동·경북북부", lat: 36.568, lng: 128.725, land: "11H10000", temp: "11H10501" }, // 안동
	{ label: "포항·경북동해안", lat: 36.032, lng: 129.365, land: "11H10000", temp: "11H10201" }, // 포항
	{ label: "대구·경북중남부", lat: 35.871, lng: 128.601, land: "11H10000", temp: "11H10701" }, // 대구

	// 경남·울산·부산 (11H20000)
	{ label: "진주·경남서부", lat: 35.180, lng: 128.107, land: "11H20000", temp: "11H20701" }, // 진주
	{ label: "부산·경남동부", lat: 35.180, lng: 129.075, land: "11H20000", temp: "11H20201" }, // 부산

	// 제주 (11G00000)
	{ label: "제주", lat: 33.4996, lng: 126.5312, land: "11G00000", temp: "11G00201" }, // 제주
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
