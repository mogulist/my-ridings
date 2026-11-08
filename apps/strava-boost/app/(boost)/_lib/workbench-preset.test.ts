import { expect, test } from "bun:test";
import type { Preset } from "@/lib/equipment";
import { preferredWorkbenchPreset } from "./workbench-preset";

const presets: Preset[] = [
	{ id: "road", bikeId: "a", name: "로드", parts: { wheelset: "w1" } },
	{ id: "gravel", bikeId: "a", name: "그래블", parts: { wheelset: "w2" } },
	{ id: "other", bikeId: "b", name: "다른 자전거", parts: { chain: "c1" } },
];

test("returning to a bike shows its last viewed combination ahead of the installed match", () => {
	const selected = preferredWorkbenchPreset(presets, "a", "gravel", { wheelset: "w1" });

	expect(selected?.id).toBe("gravel");
});

test("without a remembered choice, the combination matching all installed parts is selected", () => {
	const selected = preferredWorkbenchPreset(presets, "a", null, { wheelset: "w2" });

	expect(selected?.id).toBe("gravel");
});

test("deleting the remembered combination falls back to a remaining installed match", () => {
	const remaining = presets.filter((preset) => preset.id !== "road");

	expect(preferredWorkbenchPreset(remaining, "a", "road", { wheelset: "w2" })?.id).toBe("gravel");
});

test("a partial installed match falls back to the first saved combination", () => {
	const selected = preferredWorkbenchPreset(presets, "a", null, { wheelset: "w2", chain: "c1" });

	expect(selected?.id).toBe("road");
});

test("a remembered combination from another bike is ignored", () => {
	const selected = preferredWorkbenchPreset(presets, "a", "other", {});

	expect(selected?.id).toBe("road");
});

test("a bike without combinations returns no selection even when other bikes have combinations", () => {
	expect(preferredWorkbenchPreset(presets, "c", "road", {})).toBeUndefined();
});

test("deleting the final combination leaves no selection", () => {
	const remaining = presets.filter((preset) => preset.bikeId !== "a");

	expect(preferredWorkbenchPreset(remaining, "a", "road", { wheelset: "w1" })).toBeUndefined();
});
