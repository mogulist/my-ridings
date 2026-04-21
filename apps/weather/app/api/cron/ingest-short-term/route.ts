import { fetchVilageFcst, kstYmdHmToUtcIso } from "@my-ridings/kma-client";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { ingestRuns, trackedGrids } from "@/db/schema";
import { latestShortTermBaseKst } from "@/lib/kst-short-term-base";
import { requireCronAuth } from "@/lib/require-cron-auth";
import { rowsFromNormalizedShortTerm, upsertShortTermRows } from "@/lib/short-term-upsert";

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
	const { baseDate, baseTime } = latestShortTermBaseKst();
	const baseAtUtc = new Date(kstYmdHmToUtcIso(baseDate, baseTime));
	const [run] = await db
		.insert(ingestRuns)
		.values({
			kind: "short",
			cellsRequested: targets.length,
			baseAt: baseAtUtc,
		})
		.returning({ id: ingestRuns.id });
	const runId = run?.id;
	let ok = 0;
	let fail = 0;
	const errors: string[] = [];
	for (const g of targets) {
		try {
			const normalized = await fetchVilageFcst({
				nx: g.nx,
				ny: g.ny,
				baseDate,
				baseTime,
				authKey,
			});
			if (!normalized) {
				fail += 1;
				errors.push(`${g.nx},${g.ny}:empty`);
				continue;
			}
			const rows = rowsFromNormalizedShortTerm(normalized);
			await upsertShortTermRows(db, rows);
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
		baseDate,
		baseTime,
	});
}
