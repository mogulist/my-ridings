import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

type PlanRow = {
	id: string;
	name: string;
	start_date: string | null;
	public_share_token: string;
	shared_at: string | null;
	route: {
		name: string;
		rwgps_url: string;
		total_distance: number | null;
		elevation_gain: number | null;
		user_id: string;
	} | null;
	stages: { id: string }[] | null;
};

type SharedPlanCardDto = {
	public_share_token: string;
	plan_name: string;
	route_name: string;
	total_distance_m: number | null;
	elevation_gain_m: number | null;
	stage_count: number;
	start_date: string | null;
	author_nickname: string | null;
	shared_at: string | null;
};

const LIST_LIMIT = 24;

function parseRwgpsRouteId(url: string | null | undefined): string | null {
	if (!url) return null;
	const m = url.match(/\/routes\/(\d+)/);
	return m?.[1] ?? null;
}

async function fetchRwgpsRouteSummary(
	routeId: string,
): Promise<{ distance: number; elevation_gain: number } | null> {
	try {
		const res = await fetch(
			`https://ridewithgps.com/routes/${routeId}.json`,
			{
				headers: {
					Accept: "application/json",
					"User-Agent": "plan-my-route/1.0",
				},
				next: { revalidate: 3600 },
			},
		);
		if (!res.ok) return null;
		const data = (await res.json()) as {
			distance?: number;
			elevation_gain?: number;
		};
		const distance = Number(data.distance) || 0;
		const elevation_gain = Number(data.elevation_gain) || 0;
		if (distance <= 0 && elevation_gain <= 0) return null;
		return { distance, elevation_gain };
	} catch {
		return null;
	}
}

export async function GET() {
	const { data: rows, error } = await supabaseAdmin
		.from("plan")
		.select(
			`
			id,
			name,
			start_date,
			public_share_token,
			shared_at,
			route:route (
				name,
				rwgps_url,
				total_distance,
				elevation_gain,
				user_id
			),
			stages:stage (id)
		`,
		)
		.not("public_share_token", "is", null)
		.order("shared_at", { ascending: false, nullsFirst: false })
		.limit(LIST_LIMIT);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	const plans = (rows ?? []) as unknown as PlanRow[];
	const userIds = [
		...new Set(
			plans
				.map((p) => p.route?.user_id)
				.filter((id): id is string => Boolean(id)),
		),
	];

	let nicknameByUserId = new Map<string, string | null>();
	if (userIds.length > 0) {
		const { data: profiles, error: profileError } = await supabaseAdmin
			.from("user_profile")
			.select("user_id, nickname")
			.in("user_id", userIds);

		if (!profileError && profiles) {
			nicknameByUserId = new Map(
				profiles.map((row) => {
					const nick =
						typeof row.nickname === "string" ? row.nickname.trim() : "";
					return [row.user_id as string, nick || null] as const;
				}),
			);
		}
	}

	const rwgpsIdsToFetch = new Set<string>();
	for (const p of plans) {
		const r = p.route;
		if (!r?.rwgps_url) continue;
		const needsDistance =
			r.total_distance == null || Number(r.total_distance) <= 0;
		const needsElevation =
			r.elevation_gain == null || Number(r.elevation_gain) <= 0;
		if (!needsDistance && !needsElevation) continue;
		const rid = parseRwgpsRouteId(r.rwgps_url);
		if (rid) rwgpsIdsToFetch.add(rid);
	}

	const rwgpsSummaryById = new Map<
		string,
		{ distance: number; elevation_gain: number }
	>();
	await Promise.all(
		[...rwgpsIdsToFetch].map(async (id) => {
			const s = await fetchRwgpsRouteSummary(id);
			if (s) rwgpsSummaryById.set(id, s);
		}),
	);

	const items: SharedPlanCardDto[] = plans
		.filter((p) => p.route && p.public_share_token)
		.map((p) => {
			const r = p.route!;
			const uid = r.user_id;
			const rwgpsId = parseRwgpsRouteId(r.rwgps_url);
			const rwgps = rwgpsId ? rwgpsSummaryById.get(rwgpsId) : undefined;

			const dbDist = r.total_distance != null ? Number(r.total_distance) : null;
			const dbGain =
				r.elevation_gain != null ? Number(r.elevation_gain) : null;

			const total_distance_m =
				dbDist != null && dbDist > 0
					? dbDist
					: rwgps && rwgps.distance > 0
						? rwgps.distance
						: null;
			const elevation_gain_m =
				dbGain != null && dbGain > 0
					? dbGain
					: rwgps && rwgps.elevation_gain > 0
						? rwgps.elevation_gain
						: null;

			return {
				public_share_token: p.public_share_token,
				plan_name: p.name,
				route_name: r.name,
				total_distance_m,
				elevation_gain_m,
				stage_count: p.stages?.length ?? 0,
				start_date: p.start_date,
				author_nickname: uid ? (nicknameByUserId.get(uid) ?? null) : null,
				shared_at: p.shared_at,
			};
		});

	return NextResponse.json({ plans: items });
}
