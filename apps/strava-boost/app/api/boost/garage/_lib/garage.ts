import { emptyGarage, type Garage } from "@/lib/equipment";
import { stravaStore } from "@/lib/server/strava-store";
export async function garageFor(owner: number): Promise<{ garage: Garage; revision: number }> {
	const { data, error } = await stravaStore()
		.from("garages")
		.select("state,revision")
		.eq("owner_id", owner)
		.maybeSingle();
	if (error) throw error;
	return data
		? { garage: data.state, revision: data.revision }
		: { garage: emptyGarage(), revision: 0 };
}
