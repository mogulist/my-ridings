import { emptyGarage, type Garage } from "@/lib/equipment";
import type { StravaActivity } from "@/types/strava";
export function demoData(): { garage: Garage; activities: StravaActivity[] } {
	const ago = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
	const garage = emptyGarage();
	garage.bikes = [
		{ id: "bike-a", name: "자전거 A", stravaGearId: "b100" },
		{ id: "bike-b", name: "자전거 B", stravaGearId: "b200" },
		{ id: "bike-c", name: "자전거 C", stravaGearId: "b300" },
	];
	garage.parts = [
		{
			id: "wheel-1",
			name: "휠셋 01 · 50mm",
			kind: "wheelset",
			startedAt: ago(400),
			initialKm: 4508,
			retiredAt: null,
		},
		{
			id: "wheel-2",
			name: "휠셋 02 · 35mm",
			kind: "wheelset",
			startedAt: ago(120),
			initialKm: 1240,
			retiredAt: null,
		},
		{
			id: "tire-1",
			name: "GP5000 28C · 01",
			kind: "tire",
			startedAt: ago(150),
			initialKm: 1868,
			retiredAt: null,
		},
		{
			id: "tire-2",
			name: "GP5000 28C · 02",
			kind: "tire",
			startedAt: ago(60),
			initialKm: 428,
			retiredAt: null,
		},
		{
			id: "tire-3",
			name: "GP5000 28C · 03",
			kind: "tire",
			startedAt: ago(14),
			initialKm: 160,
			retiredAt: null,
		},
		{
			id: "chain-1",
			name: "체인 01 · 12단",
			kind: "chain",
			startedAt: ago(90),
			initialKm: 2088,
			retiredAt: null,
		},
		{
			id: "chain-2",
			name: "체인 02 · 12단",
			kind: "chain",
			startedAt: ago(40),
			initialKm: 860,
			retiredAt: null,
		},
	];
	const parts = {
		wheelset: "wheel-1",
		tire_front: "tire-1",
		tire_rear: "tire-2",
		chain: "chain-1",
	};
	garage.installations = [{ id: "install-1", bikeId: "bike-a", at: ago(30), parts }];
	garage.presets = [
		{ id: "preset-1", bikeId: "bike-a", name: "장거리", parts },
		{
			id: "preset-2",
			bikeId: "bike-a",
			name: "업힐",
			parts: { ...parts, wheelset: "wheel-2", tire_front: "tire-3", chain: "chain-2" },
		},
	];
	garage.rules = [{ id: "wax", targetId: "chain-1", name: "체인 왁싱", km: 300, days: null }];
	garage.services = [{ id: "service-1", ruleId: "wax", at: ago(18), note: "핫 왁싱" }];
	const activities = [
		{ id: 101, name: "양평 왕복", distance: 82400, date: ago(1) },
		{ id: 102, name: "주말 장거리", distance: 193400, date: ago(5) },
		{ id: 103, name: "저녁 한강 라이딩", distance: 36200, date: ago(10) },
	].map((a) => ({
		id: a.id,
		name: a.name,
		distance: a.distance,
		moving_time: 7200,
		elapsed_time: 8000,
		type: "Ride",
		gear_id: "b100",
		start_date: a.date,
		start_date_local: a.date,
		average_speed: 8,
		max_speed: 12,
	}));
	return { garage, activities };
}
