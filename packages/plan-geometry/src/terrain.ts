import type { TrackPoint } from "./track-point";

export type TerrainKind =
	| "flat"
	| "gentle-descent"
	| "descent"
	| "rolling"
	| "uphill"
	| "climb"
	| "unknown";
export type TerrainSegment = {
	startKm: number;
	endKm: number;
	kind: TerrainKind;
	gainM: number;
	lossM: number;
};
export type DetectedClimb = {
	id: string;
	startKm: number;
	summitKm: number;
	gainM: number;
	avgGradientPct: number;
};
export type TerrainAnalysis = {
	startKm: number;
	endKm: number;
	segments: TerrainSegment[];
	climbs: DetectedClimb[];
};
export type TerrainSummary = {
	distanceKm: number;
	gainM: number | null;
	lossM: number | null;
	segments: TerrainSegment[];
	distances: Partial<Record<TerrainKind, number>>;
	climbs: DetectedClimb[];
};

// Distance-based sampling keeps the result independent of the GPS recording frequency.
// These product thresholds are intentionally separate from Wahoo device detection.
export const TERRAIN_RULES = {
	sampleM: 50,
	maxGapM: 500,
	flatPct: 0.75,
	descentPct: -3,
	climbPct: 2,
	minClimbLengthM: 500,
	minClimbGainM: 50,
	climbBridgeM: 250,
	maxClimbDipM: 10,
	rollingWindowM: 2000,
	minRollingGainM: 20,
} as const;

type Sample = { d: number; e: number | null };

export function analyzeTerrain(track: TrackPoint[]): TerrainAnalysis {
	const raw: Sample[] = [];
	for (const p of track) {
		if (!Number.isFinite(p.d) || p.d! < 0) {
			if (raw.length) raw[raw.length - 1].e = null;
			continue;
		}
		if (raw.length && p.d! <= raw[raw.length - 1].d) {
			if (p.d! < raw[raw.length - 1].d || !Number.isFinite(p.e)) raw[raw.length - 1].e = null;
			continue;
		}
		raw.push({ d: p.d!, e: Number.isFinite(p.e) ? p.e! : null });
	}
	if (raw.length < 2)
		return {
			startKm: raw[0]?.d / 1000 || 0,
			endKm: raw[0]?.d / 1000 || 0,
			segments: [],
			climbs: [],
		};
	const samples: Sample[] = [];
	let index = 0;
	const end = raw[raw.length - 1].d;
	for (let d = raw[0].d; ; d = Math.min(end, d + TERRAIN_RULES.sampleM)) {
		while (index + 1 < raw.length - 1 && raw[index + 1].d < d) index++;
		const a = raw[index],
			b = raw[index + 1];
		const e =
			a.e == null || b.e == null || b.d - a.d > TERRAIN_RULES.maxGapM
				? null
				: a.e + (b.e - a.e) * ((d - a.d) / (b.d - a.d));
		samples.push({ d, e });
		if (d === end) break;
	}
	// Median filtering suppresses isolated spikes without rounding every summit/valley.
	const smooth = samples.map((p, i) => {
		const a = samples[i - 1],
			b = samples[i + 1];
		if (p.e == null || a?.e == null || b?.e == null) return p.e;
		return [a.e, p.e, b.e].sort((x, y) => x - y)[1];
	});
	const cells: TerrainSegment[] = [];
	for (let i = 1; i < samples.length; i++) {
		const a = samples[i - 1],
			b = samples[i];
		const ea = smooth[i - 1],
			eb = smooth[i];
		// A short missing raw sample must not vanish between resampling grid points.
		while (index > 0 && raw[index].d > a.d) index--;
		let gap = false;
		for (let j = index; j + 1 < raw.length && raw[j].d < b.d; j++) {
			if (raw[j + 1].d <= a.d) continue;
			if (
				raw[j].e == null ||
				raw[j + 1].e == null ||
				raw[j + 1].d - raw[j].d > TERRAIN_RULES.maxGapM
			)
				gap = true;
			index = j;
		}
		const delta = ea == null || eb == null || gap ? null : eb - ea;
		const pct = delta == null ? null : (delta / (b.d - a.d)) * 100;
		const kind: TerrainKind =
			pct == null
				? "unknown"
				: pct < TERRAIN_RULES.descentPct
					? "descent"
					: pct < -TERRAIN_RULES.flatPct
						? "gentle-descent"
						: pct <= TERRAIN_RULES.flatPct
							? "flat"
							: "uphill";
		cells.push({
			startKm: a.d / 1000,
			endKm: b.d / 1000,
			kind,
			gainM: Math.max(0, delta ?? 0),
			lossM: Math.max(0, -(delta ?? 0)),
		});
	}
	const climbs: DetectedClimb[] = [];
	for (let i = 0; i < cells.length; i++) {
		const c = cells[i];
		if (c.kind !== "uphill" || c.gainM / ((c.endKm - c.startKm) * 10) < TERRAIN_RULES.climbPct)
			continue;
		let lastUp = i,
			gain = 0,
			loss = 0;
		for (let j = i; j < cells.length; j++) {
			const cell = cells[j];
			if (cell.kind === "unknown") break;
			if (
				cell.startKm - cells[lastUp].endKm > TERRAIN_RULES.climbBridgeM / 1000 ||
				loss + cell.lossM > TERRAIN_RULES.maxClimbDipM
			)
				break;
			gain += cell.gainM;
			loss += cell.lossM;
			if (cell.gainM > 0) lastUp = j;
		}
		const summitKm = cells[lastUp].endKm;
		// Exclude trailing flats/descents from the candidate's climb totals.
		gain = 0;
		for (let j = i; j <= lastUp; j++) gain += cells[j].gainM;
		const length = summitKm - c.startKm;
		if (
			length * 1000 >= TERRAIN_RULES.minClimbLengthM &&
			gain >= TERRAIN_RULES.minClimbGainM &&
			gain / (length * 10) >= TERRAIN_RULES.climbPct
		) {
			climbs.push({
				id: `climb-${Math.round(c.startKm * 1000)}-${Math.round(summitKm * 1000)}`,
				startKm: c.startKm,
				summitKm,
				gainM: Math.round(gain),
				avgGradientPct: gain / (length * 10),
			});
			for (let j = i; j <= lastUp; j++) cells[j].kind = "climb";
		}
		i = lastUp;
	}
	// Describe mixed short ascents/descents as rolling, never absorb a substantial climb or a data gap.
	for (let i = 0; i < cells.length; ) {
		if (cells[i].kind === "climb" || cells[i].kind === "unknown") {
			i++;
			continue;
		}
		let j = i,
			gain = 0,
			loss = 0;
		while (
			j < cells.length &&
			cells[j].kind !== "climb" &&
			cells[j].kind !== "unknown" &&
			cells[j].endKm - cells[i].startKm <= TERRAIN_RULES.rollingWindowM / 1000
		) {
			gain += cells[j].gainM;
			loss += cells[j].lossM;
			j++;
		}
		if (gain >= TERRAIN_RULES.minRollingGainM && loss >= TERRAIN_RULES.minRollingGainM) {
			for (let k = i; k < j; k++) cells[k].kind = "rolling";
		}
		i = Math.max(i + 1, j);
	}
	// Keep sampling cells for exact clipping and cumulative ascent; consumers merge for display.
	return { startKm: raw[0].d / 1000, endKm: end / 1000, segments: cells, climbs };
}

export function summarizeTerrain(
	analysis: TerrainAnalysis,
	startKm: number,
	endKm: number,
): TerrainSummary {
	if (!Number.isFinite(startKm) || !Number.isFinite(endKm) || endKm < startKm)
		throw new RangeError("Invalid terrain range");
	const segments: TerrainSegment[] = [];
	const append = (s: TerrainSegment) => {
		const previous = segments[segments.length - 1];
		if (previous?.kind === s.kind && Math.abs(previous.endKm - s.startKm) < 1e-8) {
			previous.endKm = s.endKm;
			previous.gainM += s.gainM;
			previous.lossM += s.lossM;
		} else segments.push({ ...s });
	};
	let coveredUntil = startKm;
	for (const s of analysis.segments) {
		const start = Math.max(startKm, s.startKm),
			end = Math.min(endKm, s.endKm);
		if (end <= start) continue;
		if (start > coveredUntil + 1e-8)
			append({ startKm: coveredUntil, endKm: start, kind: "unknown", gainM: 0, lossM: 0 });
		const fraction = (end - start) / (s.endKm - s.startKm);
		append({
			startKm: start,
			endKm: end,
			kind: s.kind,
			gainM: s.gainM * fraction,
			lossM: s.lossM * fraction,
		});
		coveredUntil = end;
	}
	if (coveredUntil < endKm)
		append({ startKm: coveredUntil, endKm, kind: "unknown", gainM: 0, lossM: 0 });
	const distances: TerrainSummary["distances"] = {};
	for (const s of segments) distances[s.kind] = (distances[s.kind] ?? 0) + s.endKm - s.startKm;
	const complete = !distances.unknown;
	return {
		distanceKm: endKm - startKm,
		segments,
		distances,
		gainM: complete ? Math.round(segments.reduce((sum, s) => sum + s.gainM, 0)) : null,
		lossM: complete ? Math.round(segments.reduce((sum, s) => sum + s.lossM, 0)) : null,
		climbs: analysis.climbs.filter((c) => c.summitKm > startKm && c.startKm < endKm),
	};
}

export function nextTerrainClimb(
	analysis: TerrainAnalysis,
	currentKm: number,
	stageEndKm: number,
): DetectedClimb | null {
	return (
		analysis.climbs.find((c) => c.summitKm > currentKm + 0.05 && c.startKm < stageEndKm) ?? null
	);
}
