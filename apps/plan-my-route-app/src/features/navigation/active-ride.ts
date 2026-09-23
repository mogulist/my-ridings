import AsyncStorage from "@react-native-async-storage/async-storage";

import { forgetLastReviewRoute } from "./last-review-route";
import { normalizePlanReviewRoute } from "./review-route";

const STORAGE_KEY = "plan-my-route:active-ride:v1";

export type ActiveRide = {
	routeId: string;
	planId: string;
	routeName: string;
	planName: string;
	resumePath: string;
	startedAt: string;
};

let didClaimInitialRoute = false;
const rideListeners = new Set<() => void>();

export function subscribeActiveRide(listener: () => void): () => void {
  rideListeners.add(listener);
  return () => { rideListeners.delete(listener); };
}

function belongsToRide(pathname: string, ride: Pick<ActiveRide, "routeId" | "planId">): boolean {
	return pathname.startsWith(`/routes/${ride.routeId}/plans/${ride.planId}/`);
}

export function parseStoredActiveRide(value: string | null): ActiveRide | null {
	if (!value) return null;
	try {
		const parsed = JSON.parse(value) as Partial<ActiveRide>;
		if (
			typeof parsed.routeId !== "string" ||
			!parsed.routeId ||
			typeof parsed.planId !== "string" ||
			!parsed.planId ||
			typeof parsed.routeName !== "string" ||
			typeof parsed.planName !== "string" ||
			typeof parsed.resumePath !== "string" ||
			typeof parsed.startedAt !== "string"
		) {
			return null;
		}

		const resumePath = normalizePlanReviewRoute(parsed.resumePath);
		if (!resumePath || !belongsToRide(resumePath, parsed as ActiveRide)) return null;

		return {
			routeId: parsed.routeId,
			planId: parsed.planId,
			routeName: parsed.routeName,
			planName: parsed.planName,
			resumePath,
			startedAt: parsed.startedAt,
		};
	} catch {
		return null;
	}
}

export async function getActiveRide(): Promise<ActiveRide | null> {
	return parseStoredActiveRide(await AsyncStorage.getItem(STORAGE_KEY));
}

export function buildActiveRide(input: {
	routeId: string;
	planId: string;
	routeName: string;
	planName: string;
}, startedAt = new Date().toISOString()): ActiveRide {
	return {
		...input,
		resumePath: `/routes/${input.routeId}/plans/${input.planId}/schedule`,
		startedAt,
	};
}

export async function startActiveRide(input: {
	routeId: string;
	planId: string;
	routeName: string;
	planName: string;
}): Promise<ActiveRide> {
	const existing = await getActiveRide();
	if (existing?.planId === input.planId && existing.routeId === input.routeId) return existing;
	const ride = buildActiveRide(input);
	await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ride));
	rideListeners.forEach((listener) => listener());
	return ride;
}

export async function rememberActiveRideRoute(pathname: string): Promise<void> {
	const resumePath = normalizePlanReviewRoute(pathname);
	if (!resumePath) return;

	const ride = await getActiveRide();
	if (!ride || !belongsToRide(resumePath, ride) || ride.resumePath === resumePath) return;
	await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...ride, resumePath }));
}

export async function finishActiveRide(): Promise<void> {
	await Promise.all([AsyncStorage.removeItem(STORAGE_KEY), forgetLastReviewRoute()]);
	rideListeners.forEach((listener) => listener());
}

/** 앱 프로세스마다 한 번만 라이딩 화면을 복원한다. */
export async function claimActiveRideRoute(): Promise<string | null> {
	if (didClaimInitialRoute) return null;
	didClaimInitialRoute = true;
	return (await getActiveRide())?.resumePath ?? null;
}
