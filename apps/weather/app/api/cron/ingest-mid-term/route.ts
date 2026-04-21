import {
	fetchMidLandFcst,
	fetchMidTa,
	kstTmFcToUtcIso,
	normalizeMidTerm,
} from "@my-ridings/kma-client";
import { and, eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { ingestRuns, trackedGrids, weatherGridMeta, weatherMidTerm } from "@/db/schema";
import { latestMidTermTmFcKst } from "@/lib/kst-mid-term-base";
import { forecastYmdFromTmFc } from "@/lib/mid-term-dates";
import { requireCronAuth } from "@/lib/require-cron-auth";

const hasDayData = (d: {
	tmn: number | null;
	tmx: number | null;
	amSky: string | null;
	pmSky: string | null;
	amPop: number | null;
	pmPop: number | null;
}) =>
	d.tmn != null ||
	d.tmx != null ||
	d.amSky != null ||
	d.pmSky != null ||
	d.amPop != null ||
	d.pmPop != null;

export async function GET(req: NextRequest) {
	const deny = requireCronAuth(req);
	if (deny) return deny;
	const authKey = process.env.KMA_API_KEY;
	if (!authKey) {
		return Response.json({ error: "KMA_API_KEY missing" }, { status: 500 });
	}
	const shard = Number(req.nextUrl.searchParams.get("shard") ?? "0");
	const total = Number(req.nextUrl.searchParams.get("total") ?? "1");
	if (
		!Number.isFinite(shard) ||
		!Number.isFinite(total) ||
		total < 1 ||
		shard < 0 ||
		shard >= total
	) {
		return Response.json({ error: "Invalid shard/total" }, { status: 400 });
	}
	const grids = await db.select().from(trackedGrids);
	const targets = grids.filter((g) => (g.nx + g.ny) % total === shard);
	const tmFc = latestMidTermTmFcKst();
	const baseAtUtc = new Date(kstTmFcToUtcIso(tmFc));
	const [run] = await db
		.insert(ingestRuns)
		.values({
			kind: "mid",
			cellsRequested: targets.length,
			baseAt: baseAtUtc,
		})
		.returning({ id: ingestRuns.id });
	const runId = run?.id;
	let ok = 0;
	let fail = 0;
	const errors: string[] = [];
	for (const g of targets) {
		const [meta] = await db
			.select()
			.from(weatherGridMeta)
			.where(and(eq(weatherGridMeta.nx, g.nx), eq(weatherGridMeta.ny, g.ny)))
			.limit(1);
		const land = meta?.midRegionLand ?? null;
		const temp = meta?.midRegionTemp ?? null;
		if (!land || !temp) {
			continue;
		}
		try {
			const landItem = await fetchMidLandFcst({ regId: land, tmFc, authKey });
			const taItem = await fetchMidTa({ regId: temp, tmFc, authKey });
			const normalized = normalizeMidTerm({
				land: landItem,
				ta: taItem,
				regLandCode: land,
				regTempCode: temp,
				tmFc,
			});
			for (const d of normalized.days) {
				if (!hasDayData(d)) continue;
				const ymd = forecastYmdFromTmFc(tmFc, d.dayOffset);
				await db
					.insert(weatherMidTerm)
					.values({
						regionLandCode: land,
						regionTempCode: temp,
						forecastDate: ymd,
						baseAt: new Date(normalized.baseAt),
						tmn: d.tmn,
						tmx: d.tmx,
						amSky: d.amSky,
						pmSky: d.pmSky,
						amPop: d.amPop,
						pmPop: d.pmPop,
					})
					.onConflictDoUpdate({
						target: [
							weatherMidTerm.regionLandCode,
							weatherMidTerm.regionTempCode,
							weatherMidTerm.forecastDate,
							weatherMidTerm.baseAt,
						],
						set: {
							tmn: sql`excluded.tmn`,
							tmx: sql`excluded.tmx`,
							amSky: sql`excluded.am_sky`,
							pmSky: sql`excluded.pm_sky`,
							amPop: sql`excluded.am_pop`,
							pmPop: sql`excluded.pm_pop`,
							ingestedAt: sql`excluded.ingested_at`,
						},
					});
			}
			ok += 1;
		} catch (e) {
			fail += 1;
			errors.push(`${g.nx},${g.ny}:${e instanceof Error ? e.message : String(e)}`);
		}
	}
	if (runId != null) {
		await db
			.update(ingestRuns)
			.set({
				finishedAt: new Date(),
				cellsSucceeded: ok,
				cellsFailed: fail,
				errorSummary: errors.length ? errors.slice(0, 20).join("; ") : null,
			})
			.where(eq(ingestRuns.id, runId));
	}
	return Response.json({
		shard,
		total,
		requested: targets.length,
		succeeded: ok,
		failed: fail,
		tmFc,
	});
}
