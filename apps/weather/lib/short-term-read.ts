import { and, eq, gte, lte, max, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";

type Db = PostgresJsDatabase<typeof schema>;

export const latestBaseAtInWindow = async (
	db: Db,
	nx: number,
	ny: number,
	from: Date,
	to: Date,
): Promise<Date | null> => {
	const { weatherShortTerm } = schema;
	const [row] = await db
		.select({ b: max(weatherShortTerm.baseAt) })
		.from(weatherShortTerm)
		.where(
			and(
				eq(weatherShortTerm.nx, nx),
				eq(weatherShortTerm.ny, ny),
				gte(weatherShortTerm.forecastAt, from),
				lte(weatherShortTerm.forecastAt, to),
			),
		);
	return row?.b ?? null;
};

export const rowsForLatestBase = async (
	db: Db,
	nx: number,
	ny: number,
	from: Date,
	to: Date,
	baseAt: Date,
) => {
	const { weatherShortTerm } = schema;
	return db
		.select()
		.from(weatherShortTerm)
		.where(
			and(
				eq(weatherShortTerm.nx, nx),
				eq(weatherShortTerm.ny, ny),
				eq(weatherShortTerm.baseAt, baseAt),
				gte(weatherShortTerm.forecastAt, from),
				lte(weatherShortTerm.forecastAt, to),
			),
		)
		.orderBy(weatherShortTerm.forecastAt);
};

/**
 * 최신 발표회차(`baseAt` 최대) 안에서 `forecastAt`이 `at`에 시간적으로 가장 가까운 1행.
 * (과거만 쓰던 방식은 ETA가 예보 범위 끝을 넘으면 null이 되어 구간 예보가 비는 문제가 있었다.)
 */
export const nearestShortTermRow = async (db: Db, nx: number, ny: number, at: Date) => {
	const { weatherShortTerm } = schema;
	const [latestBaseRow] = await db
		.select({ b: max(weatherShortTerm.baseAt) })
		.from(weatherShortTerm)
		.where(and(eq(weatherShortTerm.nx, nx), eq(weatherShortTerm.ny, ny)));
	const base = latestBaseRow?.b;
	if (!base) return null;
	const atIso = at.toISOString();
	const [row] = await db
		.select()
		.from(weatherShortTerm)
		.where(
			and(
				eq(weatherShortTerm.nx, nx),
				eq(weatherShortTerm.ny, ny),
				eq(weatherShortTerm.baseAt, base),
			),
		)
		.orderBy(
			sql`abs(extract(epoch from (${weatherShortTerm.forecastAt} - ${sql.raw(`'${atIso}'`)}::timestamptz)))`,
		)
		.limit(1);
	return row ?? null;
};

export const numToNullable = (v: unknown): number | null => {
	if (v == null) return null;
	if (typeof v === "number") return Number.isFinite(v) ? v : null;
	if (typeof v === "string") {
		const n = Number(v);
		return Number.isFinite(n) ? n : null;
	}
	return null;
};

export const etagForRows = (rows: { forecastAt: Date; baseAt: Date }[]): string => {
	const payload = rows
		.map((r) => `${r.forecastAt.toISOString()}|${r.baseAt.toISOString()}`)
		.join(";");
	let h = 0;
	for (let i = 0; i < payload.length; i += 1) {
		h = (h * 31 + payload.charCodeAt(i)) | 0;
	}
	return `W/"${(h >>> 0).toString(16)}"`;
};
