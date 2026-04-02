export type ReviewState = "interested" | "neutral" | "dismissed";

export type PlaceReviewRow = {
	id: string;
	place_id: string;
	place_name: string;
	place_url: string | null;
	address_name: string | null;
	lat: number | null;
	lng: number | null;
	place_kind: string;
	review_state: ReviewState;
	note: string | null;
	route_id: string | null;
	plan_id: string | null;
	stage_id: string | null;
	created_at: string;
	updated_at: string;
};

/** DB·API 이전 값(up2/up1/down)을 앱 상태로 통일 */
export function normalizeReviewState(raw: unknown): ReviewState {
	if (raw === "interested" || raw === "neutral" || raw === "dismissed") return raw;
	if (raw === "up2" || raw === "up1") return "interested";
	if (raw === "down") return "dismissed";
	return "neutral";
}
