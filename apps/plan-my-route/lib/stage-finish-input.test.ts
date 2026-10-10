import { expect, test } from "bun:test";
import { parseStageFinishInput } from "./stage-finish-input";
const id = "11111111-1111-4111-8111-111111111111";
const body = {
	requestId: id,
	currentStageId: id,
	nextStageId: id,
	newEndM: 8000,
	expectedCurrentStartM: 0,
	expectedCurrentEndM: 10000,
	expectedNextStartM: 10000,
	expectedNextEndM: 20000,
	currentGainM: 80,
	currentLossM: 0,
	nextGainM: 120,
	nextLossM: 0,
	poiIds: [id, id],
};
test("validates all boundaries and normalizes duplicate POI ids", () => {
	expect(parseStageFinishInput(body)?.poiIds).toEqual([id]);
	for (const b of [
		null,
		{},
		{ ...body, newEndM: 10000 },
		{ ...body, newEndM: 0 },
		{ ...body, currentGainM: NaN },
		{ ...body, expectedNextStartM: 11000 },
		{ ...body, requestId: "invalid" },
		{ ...body, poiIds: ["invalid"] },
	])
		expect(parseStageFinishInput(b)).toBeNull();
});
