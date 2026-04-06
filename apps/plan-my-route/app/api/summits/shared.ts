import { auth } from "@/auth";
import { normalizeSummitName } from "@/app/types/summitCatalog";
import { supabaseAdmin } from "@/lib/supabase";

export const SUMMIT_SELECT_COLS =
	"id, name, name_normalized, lat, lng, elevation_m, is_official, status, created_by, source_route_id, source_plan_id, created_at, updated_at";

const DEGREE_PER_METER_LAT = 1 / 111_320;
const SUMMIT_DUPLICATE_RADIUS_METERS = 120;

export type AdminGateResult =
	| { ok: true; userId: string }
	| { ok: false; status: number; message: string };

export const assertSummitAdmin = async (): Promise<AdminGateResult> => {
	const session = await auth();
	if (!session?.user?.id) {
		return { ok: false, status: 401, message: "Unauthorized" };
	}

	const allowedUserIds = (process.env.SUMMIT_EDITOR_USER_IDS ?? "")
		.split(",")
		.map((v) => v.trim())
		.filter(Boolean);

	const allowedEmails = (process.env.SUMMIT_EDITOR_EMAILS ?? "")
		.split(",")
		.map((v) => v.trim().toLowerCase())
		.filter(Boolean);

	// 로컬/개발 환경에서 env 미설정 시 기능이 완전히 막히지 않도록 로그인 사용자 허용
	if (allowedUserIds.length === 0 && allowedEmails.length === 0) {
		return { ok: true, userId: session.user.id };
	}

	const isAllowedByUserId =
		allowedUserIds.length > 0 && allowedUserIds.includes(session.user.id);
	const sessionEmail = (session.user.email ?? "").trim().toLowerCase();
	const isAllowedByEmail =
		allowedEmails.length > 0 &&
		sessionEmail.length > 0 &&
		allowedEmails.includes(sessionEmail);

	if (!isAllowedByUserId && !isAllowedByEmail) {
		return { ok: false, status: 403, message: "Forbidden" };
	}

	return { ok: true, userId: session.user.id };
};

export const parseNumber = (value: unknown): number | null => {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return null;
};

export const normalizeOptionalText = (value: unknown): string | null => {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
};

export const haversineMeters = (
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number,
): number => {
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLng = toRad(lng2 - lng1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
	return 2 * 6_371_000 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const checkNearbyDuplicate = async ({
	name,
	lat,
	lng,
	excludeId,
}: {
	name: string;
	lat: number;
	lng: number;
	excludeId?: string;
}): Promise<{ duplicate: boolean; reason: string | null }> => {
	const normalizedName = normalizeSummitName(name);
	const latRadiusDeg = SUMMIT_DUPLICATE_RADIUS_METERS * DEGREE_PER_METER_LAT;
	const lngRadiusDeg =
		SUMMIT_DUPLICATE_RADIUS_METERS *
		(1 / (111_320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01)));

	let query = supabaseAdmin
		.from("summit_catalog")
		.select("id, name_normalized, lat, lng")
		.gte("lat", lat - latRadiusDeg)
		.lte("lat", lat + latRadiusDeg)
		.gte("lng", lng - lngRadiusDeg)
		.lte("lng", lng + lngRadiusDeg)
		.limit(50);

	if (excludeId) query = query.neq("id", excludeId);

	const { data, error } = await query;
	if (error || !data) {
		return { duplicate: false, reason: null };
	}

	for (const row of data as { name_normalized: string; lat: number; lng: number }[]) {
		if (row.name_normalized !== normalizedName) continue;
		const dist = haversineMeters(lat, lng, Number(row.lat), Number(row.lng));
		if (dist <= SUMMIT_DUPLICATE_RADIUS_METERS) {
			return { duplicate: true, reason: "nearby summit with same name already exists" };
		}
	}

	return { duplicate: false, reason: null };
};
