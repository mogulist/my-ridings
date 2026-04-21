import { latLngToGrid } from "@my-ridings/weather-grid";
import { alongForecastBodySchema, alongForecastResponseSchema } from "@my-ridings/weather-types";
import { sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { trackedGrids } from "@/db/schema";
import { etaAtIso, pointAlongPolylineKm, polylineLengthKm } from "@/lib/along-route";
import { polylineReasonTag } from "@/lib/polyline-hash";
import { requireInternalAuth } from "@/lib/require-internal-auth";
import { nearestShortTermRow, numToNullable } from "@/lib/short-term-read";

const CACHE = "public, s-maxage=600, stale-while-revalidate=3600";

export async function POST(req: NextRequest) {
	const deny = requireInternalAuth(req);
	if (deny) return deny;
	let bodyJson: unknown;
	try {
		bodyJson = await req.json();
	} catch {
		return Response.json({ error: "Invalid JSON" }, { status: 400 });
	}
	const parsed = alongForecastBodySchema.safeParse(bodyJson);
	if (!parsed.success) {
		return Response.json({ error: parsed.error.flatten() }, { status: 400 });
	}
	const { polyline, segments, departAt, paceKmh } = parsed.data;
	const totalKm = polylineLengthKm(polyline);
	const reason = polylineReasonTag(polyline);
	const segList: {
		index: number;
		fromKm: number;
		toKm: number;
		mid: [number, number];
		etaAt: string;
		grid: { nx: number; ny: number };
		forecast: {
			tempC: number | null;
			popPct: number | null;
			sky: number | null;
			pty: number | null;
			windMs: number | null;
			humidityPct: number | null;
			rainMm: number | null;
			snowCm: number | null;
		};
	}[] = [];
	const seen = new Set<string>();
	for (let i = 0; i < segments; i += 1) {
		const fromKm = (totalKm * i) / segments;
		const toKm = (totalKm * (i + 1)) / segments;
		const midKm = (fromKm + toKm) / 2;
		const mid = pointAlongPolylineKm(polyline, midKm);
		const { nx, ny } = latLngToGrid(mid[0], mid[1]);
		const etaAt = etaAtIso(departAt, toKm / paceKmh);
		const row = await nearestShortTermRow(db, nx, ny, new Date(etaAt));
		const forecast = {
			tempC: row ? numToNullable(row.tempC) : null,
			popPct: row?.popPct ?? null,
			sky: row?.sky ?? null,
			pty: row?.pty ?? null,
			windMs: row ? numToNullable(row.windMs) : null,
			humidityPct: row?.humidityPct ?? null,
			rainMm: row ? numToNullable(row.rainMm) : null,
			snowCm: row ? numToNullable(row.snowCm) : null,
		};
		segList.push({
			index: i,
			fromKm,
			toKm,
			mid,
			etaAt,
			grid: { nx, ny },
			forecast,
		});
		const key = `${nx},${ny}`;
		if (!seen.has(key)) {
			seen.add(key);
			await db
				.insert(trackedGrids)
				.values({ nx, ny, reason })
				.onConflictDoUpdate({
					target: [trackedGrids.nx, trackedGrids.ny],
					set: {
						lastRequestedAt: new Date(),
						reason: sql`excluded.reason`,
					},
				});
		}
	}
	const out = alongForecastResponseSchema.parse({
		totalKm,
		segments: segList.map((s) => ({
			index: s.index,
			fromKm: s.fromKm,
			toKm: s.toKm,
			midpoint: { lat: s.mid[0], lng: s.mid[1] },
			etaAt: s.etaAt,
			grid: s.grid,
			forecast: s.forecast,
		})),
	});
	return Response.json(out, { headers: { "Cache-Control": CACHE } });
}
