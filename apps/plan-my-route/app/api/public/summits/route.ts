import { NextRequest, NextResponse } from "next/server";
import type { SummitCatalogRow } from "@/app/types/summitCatalog";
import { supabaseAdmin } from "@/lib/supabase";
import { parseNumber, SUMMIT_SELECT_COLS } from "@/app/api/summits/shared";

const DEFAULT_LIMIT = 300;
const MAX_LIMIT = 2000;

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);

	const minLat = parseNumber(searchParams.get("minLat"));
	const maxLat = parseNumber(searchParams.get("maxLat"));
	const minLng = parseNumber(searchParams.get("minLng"));
	const maxLng = parseNumber(searchParams.get("maxLng"));

	const limitRaw = parseNumber(searchParams.get("limit"));
	const limit =
		limitRaw == null
			? DEFAULT_LIMIT
			: Math.min(Math.max(Math.round(limitRaw), 1), MAX_LIMIT);

	let query = supabaseAdmin
		.from("summit_catalog")
		.select(SUMMIT_SELECT_COLS)
		.eq("is_official", true)
		.eq("status", "approved")
		.order("updated_at", { ascending: false })
		.limit(limit);

	if (minLat != null) query = query.gte("lat", minLat);
	if (maxLat != null) query = query.lte("lat", maxLat);
	if (minLng != null) query = query.gte("lng", minLng);
	if (maxLng != null) query = query.lte("lng", maxLng);

	const { data, error } = await query;
	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json((data ?? []) as SummitCatalogRow[]);
}
