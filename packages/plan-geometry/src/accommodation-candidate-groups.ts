export const ACCOMMODATION_GROUP_GAP_KM = 5;

export type AccommodationCandidate = {
	id: string;
	distanceKm: number;
	sortOrder: number | null;
};

export type AccommodationCandidateGroup<T extends AccommodationCandidate> = {
	items: T[];
	startDistanceKm: number;
	endDistanceKm: number;
	additionalDistanceKm: number | null;
};

function sortGroupItems<T extends AccommodationCandidate>(items: T[]): T[] {
	return [...items].sort((a, b) => {
		if (a.sortOrder != null || b.sortOrder != null) {
			if (a.sortOrder == null) return 1;
			if (b.sortOrder == null) return -1;
			if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
		}
		if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
		return a.id.localeCompare(b.id);
	});
}

/**
 * 거리 군집은 경로 진행 순서로 고정하고, 사용자가 정한 우선순위는 같은 군집 안에서만 적용한다.
 */
export function groupAccommodationCandidates<T extends AccommodationCandidate>(
	candidates: T[],
	gapKm = ACCOMMODATION_GROUP_GAP_KM,
): AccommodationCandidateGroup<T>[] {
	if (candidates.length === 0) return [];

	const byDistance = [...candidates].sort((a, b) => {
		if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
		return a.id.localeCompare(b.id);
	});
	const rawGroups: T[][] = [];

	for (const candidate of byDistance) {
		const current = rawGroups.at(-1);
		const previous = current?.at(-1);
		if (!current || !previous || candidate.distanceKm - previous.distanceKm >= gapKm) {
			rawGroups.push([candidate]);
		} else {
			current.push(candidate);
		}
	}

	return rawGroups.map((items, index) => {
		const startDistanceKm = items[0]?.distanceKm ?? 0;
		const endDistanceKm = items.at(-1)?.distanceKm ?? startDistanceKm;
		const previousStartDistanceKm = rawGroups[index - 1]?.[0]?.distanceKm;
		const additionalDistanceKm =
			previousStartDistanceKm == null
				? null
				: Math.round((startDistanceKm - previousStartDistanceKm) * 100) / 100;
		return {
			items: sortGroupItems(items),
			startDistanceKm,
			endDistanceKm,
			additionalDistanceKm,
		};
	});
}
