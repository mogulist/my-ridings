import { type NextRequest, NextResponse } from "next/server";
import { ownerFor, StorageError } from "@/lib/server/strava-session";
import { databaseConfigured, stravaStore } from "@/lib/server/strava-store";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers });
const failure = (error: unknown) =>
	error instanceof StorageError
		? json({ error: error.message }, error.status)
		: json({ error: "활동 저장소에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 503);

export async function GET(request: NextRequest) {
	if (!databaseConfigured()) return json({ enabled: false });
	try {
		const owner = await ownerFor(request);
		const after = Number(request.nextUrl.searchParams.get("after") || 0);
		if (!Number.isSafeInteger(after) || after < 0)
			throw new StorageError("잘못된 페이지입니다.", 400);
		const id = request.nextUrl.searchParams.get("id");
		if (id !== null && (!Number.isSafeInteger(Number(id)) || Number(id) <= 0))
			throw new StorageError("잘못된 활동입니다.", 400);
		const db = stravaStore();
		let query = db
			.from("activities")
			.select("activity_id,data")
			.eq("owner_id", owner)
			.gt("activity_id", after)
			.order("activity_id")
			.limit(500);
		if (id !== null) query = query.eq("activity_id", Number(id));
		const [activities, sync] = await Promise.all([
			request.nextUrl.searchParams.has("meta") ? Promise.resolve({ data: [], error: null }) : query,
			db.from("sync_state").select("last_sync_at").eq("owner_id", owner).maybeSingle(),
		]);
		if (activities.error || sync.error) throw activities.error || sync.error;
		return json({
			enabled: true,
			activities: activities.data.map((row) => row.data),
			next: activities.data.length === 500 ? activities.data.at(-1)!.activity_id : null,
			lastSyncAt: sync.data?.last_sync_at ?? null,
		});
	} catch (error) {
		return failure(error);
	}
}

export async function PUT(request: NextRequest) {
	if (!databaseConfigured()) return json({ enabled: false });
	try {
		if (request.headers.get("origin") !== request.nextUrl.origin)
			throw new StorageError("요청 출처를 확인할 수 없습니다.", 403);
		const owner = await ownerFor(request);
		const text = await request.text();
		if (Buffer.byteLength(text) > 2_000_000) throw new StorageError("요청이 너무 큽니다.", 413);
		let body: { activities?: unknown; complete?: unknown } | null;
		try {
			body = JSON.parse(text);
		} catch {
			throw new StorageError("잘못된 요청입니다.", 400);
		}
		if (
			!body ||
			!Array.isArray(body.activities) ||
			body.activities.length > 200 ||
			(body.complete !== undefined && typeof body.complete !== "boolean") ||
			!body.activities.every(
				(a: Record<string, unknown>) =>
					a &&
					typeof a === "object" &&
					Number.isSafeInteger(a.id) &&
					Number(a.id) > 0 &&
					typeof a.start_date_local === "string" &&
					typeof a.type === "string" &&
					(!a.athlete || (a.athlete as { id?: number }).id === owner),
			)
		)
			throw new StorageError("활동 형식을 확인해 주세요.", 400);
		const db = stravaStore();
		if (body.activities.length) {
			const { error } = await db.from("activities").upsert(
				body.activities.map((data: { id: number }) => ({
					owner_id: owner,
					activity_id: data.id,
					data,
				})),
				{ onConflict: "owner_id,activity_id" },
			);
			if (error) throw error;
		}
		// Only advance the checkpoint after every activity batch has been saved.
		let lastSyncAt: number | null = null;
		if (body.complete) {
			lastSyncAt = Math.floor(Date.now() / 1000);
			const { error } = await db
				.from("sync_state")
				.upsert({ owner_id: owner, last_sync_at: lastSyncAt });
			if (error) throw error;
		}
		return json({ enabled: true, lastSyncAt });
	} catch (error) {
		return failure(error);
	}
}

export async function DELETE(request: NextRequest) {
	if (!databaseConfigured()) return json({ enabled: false });
	try {
		if (request.headers.get("origin") !== request.nextUrl.origin)
			throw new StorageError("요청 출처를 확인할 수 없습니다.", 403);
		const owner = await ownerFor(request);
		const id = Number(request.nextUrl.searchParams.get("id"));
		if (!Number.isSafeInteger(id) || id <= 0) throw new StorageError("잘못된 활동입니다.", 400);
		const { error } = await stravaStore()
			.from("activities")
			.delete()
			.eq("owner_id", owner)
			.eq("activity_id", id);
		if (error) throw error;
		return json({ enabled: true });
	} catch (error) {
		return failure(error);
	}
}
