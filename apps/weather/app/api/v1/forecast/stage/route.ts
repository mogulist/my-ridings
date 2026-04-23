import {
	type StagePointPosition,
	stageBriefingBodySchema,
	stageBriefingResponseSchema,
} from "@my-ridings/weather-types";
import { and, eq, or, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { trackedGrids, weatherGridMeta } from "@/db/schema";
import { gridsAlongPolyline, polylineLengthKm } from "@/lib/along-route";
import { kstDaysUntil, kstFullBriefingWindowUtc, kstHourOfIso } from "@/lib/kst-date";
import { getMidTermDailyRowForYmd } from "@/lib/mid-term-daily-day";
import { polylineReasonTag } from "@/lib/polyline-hash";
import { requireInternalAuth } from "@/lib/require-internal-auth";
import { latestBaseAtInWindow, numToNullable, rowsForLatestBase } from "@/lib/short-term-read";

const CACHE = "public, s-maxage=600, stale-while-revalidate=3600";
const GRID_META_CHUNK = 50;

const gridKey = (nx: number, ny: number) => `${nx},${ny}`;

const loadRegionNamesByGrids = async (
	pairs: { nx: number; ny: number }[],
): Promise<Map<string, { regionName: string | null }>> => {
	const uniq = new Map<string, { nx: number; ny: number }>();
	for (const p of pairs) {
		const k = gridKey(p.nx, p.ny);
		if (!uniq.has(k)) uniq.set(k, p);
	}
	const list = [...uniq.values()];
	const out = new Map<string, { regionName: string | null }>();
	for (let i = 0; i < list.length; i += GRID_META_CHUNK) {
		const chunk = list.slice(i, i + GRID_META_CHUNK);
		if (chunk.length === 0) continue;
		const rows = await db
			.select({
				nx: weatherGridMeta.nx,
				ny: weatherGridMeta.ny,
				regionName: weatherGridMeta.regionName,
			})
			.from(weatherGridMeta)
			.where(
				or(...chunk.map((p) => and(eq(weatherGridMeta.nx, p.nx), eq(weatherGridMeta.ny, p.ny)))),
			);
		for (const r of rows) {
			out.set(gridKey(r.nx, r.ny), { regionName: r.regionName });
		}
	}
	return out;
};

const positionFor = (i: number, n: number): StagePointPosition => {
	if (n <= 1) return "departure";
	if (i === 0) return "departure";
	if (i === n - 1) return "arrival";
	return "along";
};

export async function POST(req: NextRequest) {
	const deny = requireInternalAuth(req);
	if (deny) return deny;
	let bodyJson: unknown;
	try {
		bodyJson = await req.json();
	} catch {
		return Response.json({ error: "Invalid JSON" }, { status: 400 });
	}
	const parsed = stageBriefingBodySchema.safeParse(bodyJson);
	if (!parsed.success) {
		return Response.json({ error: parsed.error.flatten() }, { status: 400 });
	}
	const { polyline, targetDate } = parsed.data;
	const totalKm = polylineLengthKm(polyline);
	if (totalKm <= 0) {
		return Response.json({ error: "Invalid polyline length" }, { status: 400 });
	}
	const reason = polylineReasonTag(polyline);
	const daysUntil = kstDaysUntil(targetDate);
	const useMid = daysUntil >= 3;
	const runs = gridsAlongPolyline(polyline, totalKm);
	if (runs.length === 0) {
		return Response.json({ error: "No grid segments" }, { status: 400 });
	}

	const seen = new Set<string>();
	for (const p of runs) {
		const k = gridKey(p.nx, p.ny);
		if (seen.has(k)) continue;
		seen.add(k);
		await db
			.insert(trackedGrids)
			.values({ nx: p.nx, ny: p.ny, reason })
			.onConflictDoUpdate({
				target: [trackedGrids.nx, trackedGrids.ny],
				set: {
					lastRequestedAt: new Date(),
					reason: sql`excluded.reason`,
				},
			});
	}

	const metas = await loadRegionNamesByGrids(runs);
	const nSeg = runs.length;

	if (useMid) {
		const dailyRows = await Promise.all(
			runs.map((r) => getMidTermDailyRowForYmd(r.nx, r.ny, targetDate)),
		);
		const points = runs.map((r, i) => {
			const m = metas.get(gridKey(r.nx, r.ny));
			return {
				index: i,
				position: positionFor(i, nSeg),
				kmFrom: r.kmFrom,
				kmTo: r.kmTo,
				regionName: m?.regionName?.trim() || null,
				nx: r.nx,
				ny: r.ny,
				midpoint: { lat: r.mid[0], lng: r.mid[1] },
				daily: dailyRows[i] ?? null,
			};
		});
		const hasAnyMidDaily = points.some((p) => p.daily != null);
		if (hasAnyMidDaily) {
			const out = stageBriefingResponseSchema.parse({
				mode: "mid" as const,
				targetDate,
				totalKm,
				points,
			});
			return Response.json(out, { headers: { "Cache-Control": CACHE } });
		}
	}

	const { from, to } = kstFullBriefingWindowUtc(targetDate);
	const shortPoints = await Promise.all(
		runs.map((r, i) => {
			const m = metas.get(gridKey(r.nx, r.ny));
			return buildShortPoint(
				{
					index: i,
					position: positionFor(i, nSeg),
					kmFrom: r.kmFrom,
					kmTo: r.kmTo,
					regionName: m?.regionName?.trim() || null,
					nx: r.nx,
					ny: r.ny,
					mid: r.mid,
				},
				from,
				to,
			);
		}),
	);
	const out = stageBriefingResponseSchema.parse({
		mode: "short" as const,
		targetDate,
		totalKm,
		points: shortPoints,
	});
	return Response.json(out, { headers: { "Cache-Control": CACHE } });
}

async function buildShortPoint(
	seg: {
		index: number;
		position: StagePointPosition;
		kmFrom: number;
		kmTo: number;
		regionName: string | null;
		nx: number;
		ny: number;
		mid: [number, number];
	},
	from: Date,
	to: Date,
) {
	const { nx, ny, mid, ...rest } = seg;
	const maxBase = await latestBaseAtInWindow(db, nx, ny, from, to);
	const rows = maxBase ? await rowsForLatestBase(db, nx, ny, from, to, maxBase) : [];
	const raw = rows.map((r) => ({
		at: r.forecastAt.toISOString(),
		tempC: numToNullable(r.tempC),
		popPct: r.popPct,
		sky: r.sky,
		pty: r.pty,
		windMs: numToNullable(r.windMs),
		humidityPct: r.humidityPct,
		rainMm: numToNullable(r.rainMm),
		snowCm: numToNullable(r.snowCm),
	}));
	const hourly = raw.filter((h) => {
		const k = kstHourOfIso(h.at);
		return k >= 3 && k <= 23;
	});
	return {
		...rest,
		midpoint: { lat: mid[0], lng: mid[1] },
		nx,
		ny,
		hourly,
	};
}
