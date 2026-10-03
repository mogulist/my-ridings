import type {
  CpMarkerOnRoute,
  SummitMarkerOnRoute,
} from "@/features/api/plan-my-route";

const DUPLICATE_DISTANCE_KM = 0.5;

export function removeSummitsDuplicatedByCheckpoints(
  summits: SummitMarkerOnRoute[],
  checkpoints: CpMarkerOnRoute[],
): SummitMarkerOnRoute[] {
  return summits.filter((summit) => {
    const summitName = normalizeMarkerName(summit.name);
    if (!summitName) return true;

    return !checkpoints.some(
      (checkpoint) =>
        normalizeMarkerName(checkpoint.name) === summitName &&
        Math.abs(checkpoint.distanceKm - summit.distanceKm) <= DUPLICATE_DISTANCE_KM,
    );
  });
}

function normalizeMarkerName(name: string): string {
  return name
    .trim()
    .replace(/^cp\s*[-–—_:·]?\s*/i, "")
    .replace(/[\s\-–—_:·]+/g, "")
    .toLocaleLowerCase("ko-KR");
}
