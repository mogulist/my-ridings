import { after, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-authenticated-user";
import { regenerateRouteCoverImages } from "@/lib/route-cover";
import { supabaseAdmin } from "@/lib/supabase";

type DbStage = {
	title: string | null;
	start_distance: number;
	end_distance: number;
	elevation_gain: number | null;
	elevation_loss: number | null;
};

type DbPlan = {
	name: string;
	sort_order: number | null;
	start_date: string | null;
	created_at?: string;
	stages?: DbStage[];
};

type RouteWithPlans = {
	name: string;
	rwgps_url: string;
	total_distance: number | null;
	elevation_gain: number | null;
	elevation_loss: number | null;
	smoothing_param: number | null;
	start_date: string | null;
	plans?: DbPlan[];
};

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const user = await getAuthenticatedUser(request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await params;

	try {
		const { data: sourceRoute, error: sourceError } = await supabaseAdmin
			.from("route")
			.select(`
				name,
				rwgps_url,
				total_distance,
				elevation_gain,
				elevation_loss,
				smoothing_param,
				start_date,
				plans:plan (
					name,
					sort_order,
					start_date,
					created_at,
					stages:stage (
						title,
						start_distance,
						end_distance,
						elevation_gain,
						elevation_loss
					)
				)
			`)
			.eq("id", id)
			.eq("user_id", user.id)
			.single<RouteWithPlans>();

		if (sourceError || !sourceRoute) {
			return NextResponse.json({ error: "Route not found" }, { status: 404 });
		}

		const { data: newRoute, error: insertRouteError } = await supabaseAdmin
			.from("route")
			.insert({
				user_id: user.id,
				name: `${sourceRoute.name} (복제)`,
				rwgps_url: sourceRoute.rwgps_url,
				total_distance: sourceRoute.total_distance,
				elevation_gain: sourceRoute.elevation_gain,
				elevation_loss: sourceRoute.elevation_loss,
				smoothing_param: sourceRoute.smoothing_param,
				start_date: sourceRoute.start_date,
			})
			.select()
			.single();

		if (insertRouteError || !newRoute) throw insertRouteError;

		after(async () => {
			try {
				await regenerateRouteCoverImages({
					routeId: newRoute.id,
					rwgpsUrl: newRoute.rwgps_url,
				});
			} catch (coverError) {
				console.error("Failed to generate duplicated route cover images:", coverError);
			}
		});

		const sortedPlans = [...(sourceRoute.plans ?? [])].sort((a, b) => {
			const orderA = a.sort_order ?? Number.MAX_SAFE_INTEGER;
			const orderB = b.sort_order ?? Number.MAX_SAFE_INTEGER;
			if (orderA !== orderB) return orderA - orderB;
			const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
			const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
			return createdA - createdB;
		});

		for (const plan of sortedPlans) {
			const { data: newPlan, error: insertPlanError } = await supabaseAdmin
				.from("plan")
				.insert({
					route_id: newRoute.id,
					name: plan.name,
					sort_order: plan.sort_order,
					start_date: plan.start_date,
				})
				.select()
				.single();

			if (insertPlanError || !newPlan) throw insertPlanError;

			const stagesToInsert = (plan.stages ?? []).map((stage) => ({
				plan_id: newPlan.id,
				title: stage.title,
				start_distance: stage.start_distance,
				end_distance: stage.end_distance,
				elevation_gain: stage.elevation_gain,
				elevation_loss: stage.elevation_loss,
			}));

			if (stagesToInsert.length === 0) continue;

			const { error: insertStagesError } = await supabaseAdmin
				.from("stage")
				.insert(stagesToInsert);
			if (insertStagesError) throw insertStagesError;
		}

		return NextResponse.json(newRoute, { status: 201 });
	} catch (error: any) {
		console.error("POST /api/routes/[id]/duplicate error:", error);
		return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
	}
}
