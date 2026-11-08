import { expect, test } from "bun:test";
import { emptyGarage, type Preset, validateGarage } from "@/lib/equipment";

function fixture() {
	const garage = emptyGarage();
	garage.bikes = [{ id: "bike", name: "Ostro", stravaGearId: "b1" }];
	const preset: Preset = { id: "first", bikeId: "bike", name: "353 · 오천성", parts: {} };
	garage.presets = [preset];
	return { garage, preset };
}

test("existing combinations without usage dates remain valid", () => {
	const { garage } = fixture();

	expect(() => validateGarage(garage)).not.toThrow();
});

test("two alternating combinations can have overlapping usage dates on the same bike", () => {
	const { garage, preset } = fixture();
	preset.usedFrom = "2025-10-26";
	preset.usedUntil = null;
	garage.presets.push({
		id: "second",
		bikeId: "bike",
		name: "353 · 미셀린",
		parts: {},
		usedFrom: "2026-04-18",
		usedUntil: "2026-08-31",
	});

	expect(() => validateGarage(garage)).not.toThrow();
});

for (const [label, change] of [
	["invalid calendar date", { usedFrom: "2026-02-30" }],
	["end before start", { usedFrom: "2026-04-18", usedUntil: "2026-04-17" }],
	["non-boolean estimate", { estimated: "yes" }],
	["oversized evidence note", { note: "x".repeat(4001) }],
] as const) {
	test(`saving combination usage rejects ${label}`, () => {
		const { garage, preset } = fixture();
		Object.assign(preset, change);

		expect(() => validateGarage(garage)).toThrow("조합의 시작일·종료일과 메모");
	});
}

test("a first-use date and free-form return-to-use note do not change rides or installations", () => {
	const { garage, preset } = fixture();
	preset.usedFrom = "2025-10-26";
	preset.usedUntil = null;
	preset.estimated = true;
	preset.note = "2026-09-01 다시 사용. 중간에는 미셀린과 번갈아 사용.";
	garage.assignments = [{ activityId: 1, bikeId: "bike", parts: {} }];
	const original = structuredClone(garage);

	validateGarage(garage);

	expect(garage).toEqual(original);
});
