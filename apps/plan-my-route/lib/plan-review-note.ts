export const PLAN_REVIEW_NOTE_MAX_LENGTH = 2000;

export type PlanReviewNoteParseResult =
	| { ok: true; value: string | null }
	| { ok: false; error: string };

export function parsePlanReviewNote(input: unknown): PlanReviewNoteParseResult {
	if (input === null) return { ok: true, value: null };
	if (typeof input !== "string") {
		return { ok: false, error: "review_note must be a string or null" };
	}

	const value = input.trim();
	if (value.length > PLAN_REVIEW_NOTE_MAX_LENGTH) {
		return {
			ok: false,
			error: `review_note must be ${PLAN_REVIEW_NOTE_MAX_LENGTH} characters or fewer`,
		};
	}

	return { ok: true, value: value || null };
}
