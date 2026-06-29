export type GpxPoint = {
  lat: number;
  lng: number;
  ele?: number;
};

export type GpxPointWithDistance = GpxPoint & { distanceKm: number };


const EARTH_RADIUS_KM = 6371;

function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * GpxPoint[]에 누적 거리(distanceKm)를 붙여 반환. 첫 점은 0.
 */
export function addCumulativeDistance(
  points: GpxPoint[]
): GpxPointWithDistance[] {
  if (points.length === 0) return [];
  const result: GpxPointWithDistance[] = [
    { ...points[0], distanceKm: 0 },
  ];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const segmentKm = haversineDistanceKm(
      prev.lat,
      prev.lng,
      curr.lat,
      curr.lng
    );
    result.push({
      ...curr,
      distanceKm: result[i - 1].distanceKm + segmentKm,
    });
  }
  return result;
}

/**
 * GPX XML에서 trkpt 블록 단위로 파싱. lat, lon, 자식 <ele> 추출.
 */
export function parseGpxToPoints(xml: string): GpxPoint[] {
  const points: GpxPoint[] = [];
  const trkptBlockRe = /<trkpt[^>]*>([\s\S]*?)<\/trkpt>/gi;
  let m: RegExpExecArray | null;
  while ((m = trkptBlockRe.exec(xml)) !== null) {
    const openTag = m[0].slice(0, m[0].indexOf(">") + 1);
    const inner = m[1];
    const latMatch = /lat=["']([^"']+)["']/i.exec(openTag);
    const lonMatch = /lon=["']([^"']+)["']/i.exec(openTag);
    const lat = latMatch ? Number.parseFloat(latMatch[1]) : NaN;
    const lon = lonMatch ? Number.parseFloat(lonMatch[1]) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    let ele: number | undefined;
    const eleMatch = /<ele>\s*([-\d.]+)\s*<\/ele>/i.exec(inner);
    if (eleMatch) {
      const parsed = Number.parseFloat(eleMatch[1]);
      if (Number.isFinite(parsed)) ele = parsed;
    }
    points.push({ lat, lng: lon, ...(ele !== undefined && { ele }) });
  }
  return points;
}

/**
 * GPX URL을 fetch한 뒤 parseGpxToPoints → addCumulativeDistance 적용해 반환.
 */
export async function fetchGpxAsPointsWithDistance(
  gpxUrl: string
): Promise<GpxPointWithDistance[]> {
  const res = await fetch(gpxUrl);
  if (!res.ok) throw new Error("GPX fetch failed");
  const text = await res.text();
  const points = parseGpxToPoints(text);
  return addCumulativeDistance(points);
}

/**
 * GPX URL을 fetch한 뒤 <trkpt lat="..." lon="..."> 를 파싱해 [lat, lng][] 반환.
 */
export async function fetchGpxAsLatLngs(gpxUrl: string): Promise<[number, number][]> {
  const res = await fetch(gpxUrl);
  if (!res.ok) throw new Error("GPX fetch failed");
  const text = await res.text();
  return parseGpxToLatLngs(text);
}

/**
 * GPX XML 문자열에서 trkpt 추출 → [lat, lng][]
 * lat/lon 순서 무관하게 추출.
 */
export function parseGpxToLatLngs(xml: string): [number, number][] {
  return parseGpxToPoints(xml).map((p) => [p.lat, p.lng] as [number, number]);
}
