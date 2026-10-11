export type StageFinishInput = {
	requestId: string;
	currentStageId: string;
	nextStageId: string;
	newEndM: number;
	expectedCurrentStartM: number;
	expectedCurrentEndM: number;
	expectedNextStartM: number;
	expectedNextEndM: number;
	currentGainM: number | null;
	currentLossM: number | null;
	nextGainM: number | null;
	nextLossM: number | null;
	poiIds: string[];
};
const uuid = (v: unknown): v is string =>
	typeof v === "string" &&
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export function parseStageFinishInput(value: unknown): StageFinishInput | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const b = value as Record<string, unknown>;
	if (!["requestId", "currentStageId", "nextStageId"].every((k) => uuid(b[k]))) return null;
	if (
		![
			"newEndM",
			"expectedCurrentStartM",
			"expectedCurrentEndM",
			"expectedNextStartM",
			"expectedNextEndM",
		].every((k) => typeof b[k] === "number" && Number.isFinite(b[k]) && (b[k] as number) >= 0)
	)
		return null;
	if (
		!["currentGainM", "currentLossM", "nextGainM", "nextLossM"].every(
			(k) =>
				b[k] === null ||
				(typeof b[k] === "number" && Number.isFinite(b[k]) && (b[k] as number) >= 0),
		)
	)
		return null;
	if (!Array.isArray(b.poiIds) || b.poiIds.length > 1000 || !b.poiIds.every(uuid)) return null;
	const result = b as StageFinishInput;
	if (
		result.newEndM <= result.expectedCurrentStartM ||
		result.newEndM >= result.expectedCurrentEndM ||
		result.expectedCurrentEndM !== result.expectedNextStartM ||
		result.newEndM >= result.expectedNextEndM
	)
		return null;
	return { ...result, poiIds: [...new Set(result.poiIds)] };
}
