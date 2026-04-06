import { NextRequest, NextResponse } from "next/server";
import { normalizeSummitName, type SummitCatalogRow } from "@/app/types/summitCatalog";
import { supabaseAdmin } from "@/lib/supabase";
import {
	assertSummitAdmin,
	checkNearbyDuplicate,
	normalizeOptionalText,
	parseNumber,
	SUMMIT_SELECT_COLS,
} from "./shared";

export async function GET() {
	const gate = await assertSummitAdmin();
	if (!gate.ok) {
		return NextResponse.json({ error: gate.message }, { status: gate.status });
	}

	const { data, error } = await supabaseAdmin
		.from("summit_catalog")
		.select(SUMMIT_SELECT_COLS)
		.order("updated_at", { ascending: false });

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json((data ?? []) as SummitCatalogRow[]);
}

export async function POST(request: NextRequest) {
	const gate = await assertSummitAdmin();
	if (!gate.ok) {
		return NextResponse.json({ error: gate.message }, { status: gate.status });
	}

	try {
		const body = (await request.json()) as Record<string, unknown>;
		const name = normalizeOptionalText(body.name);
		const lat = parseNumber(body.lat);
		const lng = parseNumber(body.lng);
		const elevationN = parseNumber(body.elevation_m);
		const sourceRouteId = normalizeOptionalText(body.source_route_id);
		const sourcePlanId = normalizeOptionalText(body.source_plan_id);

		if (!name) {
			return NextResponse.json({ error: "name is required" }, { status: 400 });
		}
		if (lat == null || lng == null) {
			return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
		}

		const duplicate = await checkNearbyDuplicate({ name, lat, lng });
		if (duplicate.duplicate) {
			return NextResponse.json(
				{ error: duplicate.reason ?? "duplicate summit" },
				{ status: 409 },
			);
		}

		const row = {
			name,
			name_normalized: normalizeSummitName(name),
			lat,
			lng,
			elevation_m: elevationN == null ? null : Math.round(elevationN),
			is_official: true,
			status: "approved",
			created_by: gate.userId,
			source_route_id: sourceRouteId,
			source_plan_id: sourcePlanId,
			updated_at: new Date().toISOString(),
		};

		const { data, error } = await supabaseAdmin
			.from("summit_catalog")
			.insert(row)
			.select(SUMMIT_SELECT_COLS)
			.single();

		if (error) {
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
