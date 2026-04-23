import { appendFileSync } from "node:fs";
import { latLngToGrid } from "@my-ridings/weather-grid";
import { stageBriefingBodySchema, stageBriefingResponseSchema } from "@my-ridings/weather-types";
import { and, eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { trackedGrids, weatherGridMeta } from "@/db/schema";
import { pointAlongPolylineKm, polylineLengthKm } from "@/lib/along-route";
import { formatGridLabel } from "@/lib/grid-label";
import { kstDaysUntil, kstRidingWindowUtc } from "@/lib/kst-date";
import { getMidTermDailyRowForYmd } from "@/lib/mid-term-daily-day";
import { polylineReasonTag } from "@/lib/polyline-hash";
import { requireInternalAuth } from "@/lib/require-internal-auth";
import { latestBaseAtInWindow, numToNullable, rowsForLatestBase } from "@/lib/short-term-read";

const CACHE = "public, s-maxage=600, stale-while-revalidate=3600";

const SCROLL_ANCHORS = [6, 10, 14, 17, 20] as const;

type Resolved = {
	index: number;
	kmAlong: number;
	mid: [number, number];
	nx: number;
	ny: number;
};

const resolveFivePoints = (polyline: [number, number][], totalKm: number): Resolved[] => {
	const out: Resolved[] = [];
	for (let i = 0; i < 5; i += 1) {
		const kmAlong = (totalKm * i) / 4;
		const alongKm = i === 4 ? totalKm : Math.max(0, kmAlong);
		const mid = pointAlongPolylineKm(polyline, alongKm);
		const { nx, ny } = latLngToGrid(mid[0], mid[1]);
		out.push({ index: i, kmAlong, mid, nx, ny });
	}
	return out;
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
	const resolved = resolveFivePoints(polyline, totalKm);
	const seen = new Set<string>();
	for (const p of resolved) {
		const key = `${p.nx},${p.ny}`;
		if (seen.has(key)) continue;
		seen.add(key);
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

	if (useMid) {
		const points: Array<{
			index: number;
			kmAlong: number;
			gridLabel: string;
			nx: number;
			ny: number;
			midpoint: { lat: number; lng: number };
			daily: Awaited<ReturnType<typeof getMidTermDailyRowForYmd>>;
		}> = [];
		for (const p of resolved) {
			const [meta] = await db
				.select()
				.from(weatherGridMeta)
				.where(and(eq(weatherGridMeta.nx, p.nx), eq(weatherGridMeta.ny, p.ny)))
				.limit(1);
			const gridLabel = meta ? formatGridLabel(meta) : `격자 ${p.nx}·${p.ny}`;
			const daily = await getMidTermDailyRowForYmd(p.nx, p.ny, targetDate);
			points.push({
				index: p.index,
				kmAlong: p.kmAlong,
				gridLabel,
				nx: p.nx,
				ny: p.ny,
				midpoint: { lat: p.mid[0], lng: p.mid[1] },
				daily,
			});
		}
		const hasAnyMidDaily = points.some((p) => p.daily != null);
		if (hasAnyMidDaily) {
			const out = stageBriefingResponseSchema.parse({
				mode: "mid" as const,
				targetDate,
				totalKm,
				points,
			});
			// #region agent log
			const lineMid = JSON.stringify({
				sessionId: "b970e4",
				timestamp: Date.now(),
				runId: "repro",
				location: "stage/route.ts:mid",
				message: "stage_payload",
				hypothesisId: "H2",
				data: {
					targetDate,
					daysUntil,
					dailyNonNull: points.filter((p) => p.daily != null).length,
				},
			});
			try {
				appendFileSync("/Users/lim/repos/my-ridings/.cursor/debug-b970e4.log", `${lineMid}\n`);
			} catch {
				/* ignore */
			}
			fetch("http://127.0.0.1:7721/ingest/5bfe97dd-8e0f-4182-9d17-ebb95859ecdf", {
				method: "POST",
				headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "b970e4" },
				body: lineMid,
			}).catch(() => {});
			// #endregion
			return Response.json(out, { headers: { "Cache-Control": CACHE } });
		}
		// #region agent log
		const lineFb = JSON.stringify({
			sessionId: "b970e4",
			timestamp: Date.now(),
			runId: "post-fix",
			location: "stage/route.ts:mid_empty_fallback_short",
			message: "mid_all_daily_null_use_short",
			hypothesisId: "H2",
			data: { targetDate, daysUntil },
		});
		try {
			appendFileSync("/Users/lim/repos/my-ridings/.cursor/debug-b970e4.log", `${lineFb}\n`);
		} catch {
			/* ignore */
		}
		fetch("http://127.0.0.1:7721/ingest/5bfe97dd-8e0f-4182-9d17-ebb95859ecdf", {
			method: "POST",
			headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "b970e4" },
			body: lineFb,
		}).catch(() => {});
		// #endregion
	}

	const { from, to } = kstRidingWindowUtc(targetDate);
	const points: Array<{
		index: number;
		kmAlong: number;
		gridLabel: string;
		nx: number;
		ny: number;
		midpoint: { lat: number; lng: number };
		scrollAnchorLocalHour: 6 | 10 | 14 | 17 | 20;
		hourly: {
			at: string;
			tempC: number | null;
			popPct: number | null;
			sky: number | null;
			pty: number | null;
			windMs: number | null;
			humidityPct: number | null;
			rainMm: number | null;
			snowCm: number | null;
		}[];
	}> = [];
	for (const p of resolved) {
		const [meta] = await db
			.select()
			.from(weatherGridMeta)
			.where(and(eq(weatherGridMeta.nx, p.nx), eq(weatherGridMeta.ny, p.ny)))
			.limit(1);
		const gridLabel = meta ? formatGridLabel(meta) : `격자 ${p.nx}·${p.ny}`;
		const maxBase = await latestBaseAtInWindow(db, p.nx, p.ny, from, to);
		const rows = maxBase ? await rowsForLatestBase(db, p.nx, p.ny, from, to, maxBase) : [];
		const hourly = rows.map((r) => ({
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
		points.push({
			index: p.index,
			kmAlong: p.kmAlong,
			gridLabel,
			nx: p.nx,
			ny: p.ny,
			midpoint: { lat: p.mid[0], lng: p.mid[1] },
			scrollAnchorLocalHour: SCROLL_ANCHORS[p.index] ?? 6,
			hourly,
		});
	}
	const out = stageBriefingResponseSchema.parse({
		mode: "short" as const,
		targetDate,
		totalKm,
		points,
	});
	// #region agent log
	const lineSh = JSON.stringify({
		sessionId: "b970e4",
		timestamp: Date.now(),
		runId: "repro",
		location: "stage/route.ts:short",
		message: "stage_payload",
		hypothesisId: "H4",
		data: {
			targetDate,
			daysUntil,
			hourlyPerPoint: points.map((p) => p.hourly.length),
		},
	});
	try {
		appendFileSync("/Users/lim/repos/my-ridings/.cursor/debug-b970e4.log", `${lineSh}\n`);
	} catch {
		/* ignore */
	}
	fetch("http://127.0.0.1:7721/ingest/5bfe97dd-8e0f-4182-9d17-ebb95859ecdf", {
		method: "POST",
		headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "b970e4" },
		body: lineSh,
	}).catch(() => {});
	// #endregion
	return Response.json(out, { headers: { "Cache-Control": CACHE } });
}
