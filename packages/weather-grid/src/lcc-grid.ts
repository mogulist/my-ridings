/**
 * 기상청 단기예보 LCC(Lambert Conformal Conic) 격자 변환.
 *
 * 기상청 공식 파라미터 (기상청 공개 샘플 코드 기준):
 *   지구 반경 RE = 6371.00877 km
 *   격자 간격 GRID = 5.0 km
 *   표준 위도 SLAT1 = 30.0°, SLAT2 = 60.0°
 *   기준점 경도 OLON = 126.0°, 위도 OLAT = 38.0°
 *   기준점 격자 XO = 43, YO = 136   (1-origin)
 *
 * 좌표계:
 *   입력 lat/lng 은 WGS84 십진 도(deg). 출력 nx/ny 는 1-origin 정수 격자.
 *   전국 격자는 대략 nx ∈ [1, 149], ny ∈ [1, 253] 범위에 분포.
 */

const RE = 6371.00877;
const GRID = 5.0;
const SLAT1 = 30.0;
const SLAT2 = 60.0;
const OLON = 126.0;
const OLAT = 38.0;
const XO = 43;
const YO = 136;

const DEGRAD = Math.PI / 180.0;

const slat1Rad = SLAT1 * DEGRAD;
const slat2Rad = SLAT2 * DEGRAD;
const olonRad = OLON * DEGRAD;
const olatRad = OLAT * DEGRAD;

const sn =
	Math.log(Math.cos(slat1Rad) / Math.cos(slat2Rad)) /
	Math.log(Math.tan(Math.PI * 0.25 + slat2Rad * 0.5) / Math.tan(Math.PI * 0.25 + slat1Rad * 0.5));
const sf = (Math.tan(Math.PI * 0.25 + slat1Rad * 0.5) ** sn * Math.cos(slat1Rad)) / sn;
const ro = (RE / GRID) * (sf / Math.tan(Math.PI * 0.25 + olatRad * 0.5) ** sn);

export type Grid = { nx: number; ny: number };
export type LatLng = { lat: number; lng: number };

export const latLngToGrid = (lat: number, lng: number): Grid => {
	const ra = (RE / GRID) * (sf / Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5) ** sn);
	let theta = lng * DEGRAD - olonRad;
	if (theta > Math.PI) theta -= 2.0 * Math.PI;
	if (theta < -Math.PI) theta += 2.0 * Math.PI;
	theta *= sn;
	const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
	const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
	return { nx, ny };
};

export const gridToLatLng = (nx: number, ny: number): LatLng => {
	const xn = nx - XO;
	const yn = ro - (ny - YO);
	let ra = Math.sqrt(xn * xn + yn * yn);
	if (sn < 0) ra = -ra;
	const alat = 2.0 * Math.atan((((RE / GRID) * sf) / ra) ** (1.0 / sn)) - Math.PI * 0.5;
	let theta: number;
	if (Math.abs(xn) <= 0 && Math.abs(yn) <= 0) {
		theta = 0.0;
	} else if (Math.abs(yn) <= 0) {
		theta = Math.PI * 0.5;
		if (xn < 0) theta = -theta;
	} else {
		theta = Math.atan2(xn, yn);
	}
	const alon = theta / sn + olonRad;
	return { lat: alat / DEGRAD, lng: alon / DEGRAD };
};
