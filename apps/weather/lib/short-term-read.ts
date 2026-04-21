import { and, desc, eq, gte, lte, max } from "drizzle-orm";
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

/** `at` 시각 이전(또는 동시) 중 가장 가까운 예보 1행. */
export const nearestShortTermRow = async (db: Db, nx: number, ny: number, at: Date) => {
	const { weatherShortTerm } = schema;
	const [latestBaseRow] = await db
		.select({ b: max(weatherShortTerm.baseAt) })
		.from(weatherShortTerm)
		.where(and(eq(weatherShortTerm.nx, nx), eq(weatherShortTerm.ny, ny)));
	const base = latestBaseRow?.b;
	if (!base) return null;
	const [row] = await db
		.select()
		.from(weatherShortTerm)
		.where(
			and(
				eq(weatherShortTerm.nx, nx),
				eq(weatherShortTerm.ny, ny),
				eq(weatherShortTerm.baseAt, base),
				lte(weatherShortTerm.forecastAt, at),
			),
		)
		.orderBy(desc(weatherShortTerm.forecastAt))
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
