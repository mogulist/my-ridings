import type { NearbyDocument } from "@/lib/nearby-cache";

export const STAGE_END_DENSITY_BIN_KM = 5;
const CANDIDATE_WINDOW_KM = 5;
const MIN_CANDIDATE_GAP_KM = 12;

export type StageEndDensityBin = {
	startKm: number;
	endKm: number;
	accommodationCount: number;
	convenienceCount: number;
	score: number;
};

export type StageEndSearchCandidate = {
	absoluteDistanceKm: number;
	areaName: string;
	accommodationCount: number;
	preferredAccommodationCount: number;
	convenienceCount: number;
	score: number;
};

export type StageEndSearchAnalysis = {
	densityBins: StageEndDensityBin[];
	candidates: StageEndSearchCandidate[];
	acceptedConvenienceCount: number;
};

function routeKm(document: NearbyDocument): number | null {
	return document.route_distance_m == null ? null : document.route_distance_m / 1000;
}

export function isLikelyAlwaysOpenConvenience(name: string): boolean {
	const normalized = name.toUpperCase().replaceAll(/\s/g, "");
	return (
		normalized.includes("CU") || normalized.includes("GS25") || normalized.includes("세븐일레븐")
	);
}

export function accommodationPreferenceWeight(name: string): number {
	const normalized = name.toUpperCase();
	if (/호텔|모텔|HOTEL|MOTEL/.test(normalized)) return 2;
	if (/펜션|PENSION/.test(normalized)) return 0.55;
	return 1;
}

function areaName(document: NearbyDocument | undefined): string {
	if (!document) return "경로 주변";
	const address = document.address_name || document.road_address_name;
	const parts = address.trim().split(/\s+/).filter(Boolean);
	return parts.slice(0, Math.min(2, parts.length)).join(" ") || document.place_name;
}

function uniqueDocuments(documents: NearbyDocument[]): NearbyDocument[] {
	return [...new Map(documents.map((document) => [document.id, document])).values()];
}

export function analyzeStageEndPlaces(options: {
	startKm: number;
	endKm: number;
	accommodations: NearbyDocument[];
	conveniences: NearbyDocument[];
	maxCandidates?: number;
}): StageEndSearchAnalysis {
	const { startKm, endKm } = options;
	const accommodations = uniqueDocuments(options.accommodations).filter((document) => {
		const km = routeKm(document);
		return km != null && km >= startKm && km <= endKm;
	});
	const conveniences = uniqueDocuments(options.conveniences).filter((document) => {
		const km = routeKm(document);
		return (
			km != null &&
			km >= startKm &&
			km <= endKm &&
			isLikelyAlwaysOpenConvenience(document.place_name)
		);
	});

	const densityBins: StageEndDensityBin[] = [];
	for (let binStart = startKm; binStart < endKm; binStart += STAGE_END_DENSITY_BIN_KM) {
		const binEnd = Math.min(endKm, binStart + STAGE_END_DENSITY_BIN_KM);
		const inBin = (document: NearbyDocument) => {
			const km = routeKm(document);
			return km != null && km >= binStart && km < binEnd;
		};
		const binAccommodations = accommodations.filter(inBin);
		const binConveniences = conveniences.filter(inBin);
		densityBins.push({
			startKm: binStart,
			endKm: binEnd,
			accommodationCount: binAccommodations.length,
			convenienceCount: binConveniences.length,
			score:
				binAccommodations.reduce(
					(sum, document) => sum + accommodationPreferenceWeight(document.place_name),
					0,
				) +
				binConveniences.length * 1.5,
		});
	}

	const ranked = densityBins
		.map((bin): StageEndSearchCandidate | null => {
			const centerKm = (bin.startKm + bin.endKm) / 2;
			const near = (document: NearbyDocument) => {
				const km = routeKm(document);
				return km != null && Math.abs(km - centerKm) <= CANDIDATE_WINDOW_KM;
			};
			const nearbyAccommodations = accommodations.filter(near);
			const nearbyConveniences = conveniences.filter(near);
			if (nearbyAccommodations.length === 0 || nearbyConveniences.length === 0) return null;

			const preferredAccommodationCount = nearbyAccommodations.filter(
				(document) => accommodationPreferenceWeight(document.place_name) === 2,
			).length;
			const nearestPreferred = [...nearbyAccommodations].sort((a, b) => {
				const aPreferred = accommodationPreferenceWeight(a.place_name);
				const bPreferred = accommodationPreferenceWeight(b.place_name);
				if (aPreferred !== bPreferred) return bPreferred - aPreferred;
				return (
					Math.abs((routeKm(a) ?? centerKm) - centerKm) -
					Math.abs((routeKm(b) ?? centerKm) - centerKm)
				);
			})[0];
			const score =
				nearbyAccommodations.reduce(
					(sum, document) => sum + accommodationPreferenceWeight(document.place_name),
					0,
				) +
				nearbyConveniences.length * 1.5;
			return {
				absoluteDistanceKm: centerKm,
				areaName: areaName(nearestPreferred),
				accommodationCount: nearbyAccommodations.length,
				preferredAccommodationCount,
				convenienceCount: nearbyConveniences.length,
				score,
			};
		})
		.filter((candidate): candidate is StageEndSearchCandidate => candidate != null)
		.sort((a, b) => b.score - a.score);

	const candidates: StageEndSearchCandidate[] = [];
	for (const candidate of ranked) {
		if (
			candidates.some(
				(selected) =>
					Math.abs(selected.absoluteDistanceKm - candidate.absoluteDistanceKm) <
					MIN_CANDIDATE_GAP_KM,
			)
		) {
			continue;
		}
		candidates.push(candidate);
		if (candidates.length >= (options.maxCandidates ?? 5)) break;
	}

	return { densityBins, candidates, acceptedConvenienceCount: conveniences.length };
}
