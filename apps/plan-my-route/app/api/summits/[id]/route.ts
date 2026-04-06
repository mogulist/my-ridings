import { NextRequest, NextResponse } from "next/server";
import { normalizeSummitName, type SummitCatalogRow } from "@/app/types/summitCatalog";
import { supabaseAdmin } from "@/lib/supabase";
import {
	assertSummitAdmin,
	checkNearbyDuplicate,
	normalizeOptionalText,
	parseNumber,
	SUMMIT_SELECT_COLS,
} from "../shared";

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const gate = await assertSummitAdmin();
	if (!gate.ok) {
		return NextResponse.json({ error: gate.message }, { status: gate.status });
	}

	const { id } = await params;

	try {
		const body = (await request.json()) as Record<string, unknown>;
		const updates: Record<string, unknown> = {
			updated_at: new Date().toISOString(),
		};

		const nameProvided = Object.prototype.hasOwnProperty.call(body, "name");
		const latProvided = Object.prototype.hasOwnProperty.call(body, "lat");
		const lngProvided = Object.prototype.hasOwnProperty.call(body, "lng");

		let nextName: string | null = null;
		let nextLat: number | null = null;
		let nextLng: number | null = null;

		if (nameProvided) {
			const name = normalizeOptionalText(body.name);
			if (!name) {
				return NextResponse.json({ error: "name is invalid" }, { status: 400 });
			}
			updates.name = name;
			updates.name_normalized = normalizeSummitName(name);
			nextName = name;
		}

		if (latProvided) {
			const lat = parseNumber(body.lat);
			if (lat == null) {
				return NextResponse.json({ error: "lat is invalid" }, { status: 400 });
			}
			updates.lat = lat;
			nextLat = lat;
		}

		if (lngProvided) {
			const lng = parseNumber(body.lng);
			if (lng == null) {
				return NextResponse.json({ error: "lng is invalid" }, { status: 400 });
			}
			updates.lng = lng;
			nextLng = lng;
		}

		if (Object.prototype.hasOwnProperty.call(body, "elevation_m")) {
			const elevationN = parseNumber(body.elevation_m);
			updates.elevation_m = elevationN == null ? null : Math.round(elevationN);
		}
		if (Object.prototype.hasOwnProperty.call(body, "source_route_id")) {
			updates.source_route_id = normalizeOptionalText(body.source_route_id);
		}
		if (Object.prototype.hasOwnProperty.call(body, "source_plan_id")) {
			updates.source_plan_id = normalizeOptionalText(body.source_plan_id);
		}

		if (Object.keys(updates).length <= 1) {
			return NextResponse.json(
				{ error: "at least one field is required" },
				{ status: 400 },
			);
		}

		if (nameProvided || latProvided || lngProvided) {
			const { data: row, error: rowError } = await supabaseAdmin
				.from("summit_catalog")
				.select("id, name, lat, lng")
				.eq("id", id)
				.single();
			if (rowError || !row) {
				return NextResponse.json({ error: "summit not found" }, { status: 404 });
			}

			const duplicate = await checkNearbyDuplicate({
				name: nextName ?? row.name,
				lat: nextLat ?? Number(row.lat),
				lng: nextLng ?? Number(row.lng),
				excludeId: id,
			});
			if (duplicate.duplicate) {
				return NextResponse.json(
					{ error: duplicate.reason ?? "duplicate summit" },
					{ status: 409 },
				);
			}
		}

		const { data, error } = await supabaseAdmin
			.from("summit_catalog")
			.update(updates)
			.eq("id", id)
			.select(SUMMIT_SELECT_COLS)
			.single();

		if (error) {
			if (error.code === "PGRST116") {
				return NextResponse.json({ error: "summit not found" }, { status: 404 });
			}
			if (error.code === "23505") {
				return NextResponse.json({ error: "duplicate summit" }, { status: 409 });
			}
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(data as SummitCatalogRow);
	} catch (e: unknown) {
		const message = e instanceof Error ? e.message : "Server error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

export async function DELETE(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const gate = await assertSummitAdmin();
	if (!gate.ok) {
		return NextResponse.json({ error: gate.message }, { status: gate.status });
	}

	const { id } = await params;
	const { error } = await supabaseAdmin.from("summit_catalog").delete().eq("id", id);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json({ ok: true });
}
