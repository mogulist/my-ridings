import { NextResponse } from "next/server";
import { type Garage, isRide, validateConfiguration, validateGarage } from "@/lib/equipment";
import { ownerFor, StorageError } from "@/lib/server/strava-session";
import { stravaStore } from "@/lib/server/strava-store";
import { garageFor } from "./_lib/garage";
export const runtime = "nodejs";
const json = (value: unknown, status = 200) =>
	NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
function failure(error: unknown) {
	if (error instanceof StorageError) return json({ error: error.message }, error.status);
	const code = error && typeof error === "object" && "code" in error ? error.code : null;
	return json(
		{
			error:
				code === "PGRST205" || code === "42P01"
					? "장비 저장소 설정이 필요합니다. 장비·정비 마이그레이션을 적용한 뒤 다시 불러와 주세요."
					: "장비 기록을 저장하거나 불러오지 못했습니다. 연결 상태를 확인해 주세요.",
		},
		503,
	);
}
export async function GET(request: Request) {
	try {
		return json(await garageFor(await ownerFor(request)));
	} catch (error) {
		return failure(error);
	}
}
export async function PUT(request: Request) {
	try {
		if (request.headers.get("origin") !== new URL(request.url).origin)
			throw new StorageError("요청 출처를 확인할 수 없습니다.", 403);
		const owner = await ownerFor(request);
		const text = await request.text();
		if (Buffer.byteLength(text) > 2_000_000)
			throw new StorageError("장비 데이터가 너무 큽니다.", 413);
		let body: { garage?: unknown; revision?: unknown } | null;
		try {
			body = JSON.parse(text);
		} catch {
			throw new StorageError("요청 형식을 확인해 주세요.", 400);
		}
		if (
			!body ||
			typeof body.revision !== "number" ||
			!Number.isSafeInteger(body.revision) ||
			body.revision < 0 ||
			body.revision >= 2147483647
		)
			throw new StorageError("저장 버전을 확인해 주세요.", 400);
		try {
			validateGarage(body.garage);
		} catch (error) {
			throw new StorageError(
				error instanceof Error ? error.message : "장비 정보를 확인해 주세요.",
				400,
			);
		}
		const garage: Garage = body.garage;
		const previous = await garageFor(owner);
		for (let i = 0; i < garage.assignments.length; i += 200) {
			const batch = garage.assignments.slice(i, i + 200);
			const { data, error } = await stravaStore()
				.from("activities")
				.select("activity_id,data")
				.eq("owner_id", owner)
				.in(
					"activity_id",
					batch.map((a) => a.activityId),
				);
			if (error) throw error;
			for (const assignment of batch) {
				const row = data.find((row) => row.activity_id === assignment.activityId);
				if (!row) {
					const old = previous.garage.assignments.find(
						(a: { activityId: number }) => a.activityId === assignment.activityId,
					);
					if (old && JSON.stringify(old) === JSON.stringify(assignment)) continue;
					throw new StorageError("동기화한 라이딩에만 부품을 배정할 수 있습니다.", 400);
				}
				if (!isRide(row.data)) throw new StorageError("라이딩에만 부품을 배정할 수 있습니다.", 400);
				try {
					validateConfiguration(garage, assignment.parts, row.data.start_date);
				} catch (error) {
					throw new StorageError(
						error instanceof Error ? error.message : "부품 사용 기간을 확인해 주세요.",
						400,
					);
				}
			}
		}
		const { data, error } = await stravaStore().rpc("save_garage", {
			p_owner: owner,
			p_revision: body.revision,
			p_state: garage,
		});
		if (error) throw error;
		if (data === null)
			throw new StorageError(
				"다른 기기에서 장비 기록이 변경되었습니다. 최신 기록을 불러온 뒤 다시 수정해 주세요.",
				409,
			);
		return json({ revision: data });
	} catch (error) {
		return failure(error);
	}
}
