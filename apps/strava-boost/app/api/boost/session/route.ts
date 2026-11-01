import { NextResponse } from "next/server";
import { ownerFor, StorageError } from "@/lib/server/strava-session";
import { databaseConfigured } from "@/lib/server/strava-store";
export const runtime = "nodejs";
const json = (body: unknown, status = 200) =>
	NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(request: Request) {
	const configured = databaseConfigured();
	if (!request.headers.get("authorization")) return json({ configured, athleteId: null });
	try {
		return json({ configured, athleteId: await ownerFor(request) });
	} catch (error) {
		return json(
			{
				error: error instanceof StorageError ? error.message : "Strava 연결을 확인하지 못했습니다.",
			},
			error instanceof StorageError ? error.status : 503,
		);
	}
}
