import { type Configuration, type Preset, type Slot, slots } from "@/lib/equipment";

export function sameConfiguration(a: Configuration, b: Configuration) {
	return (Object.keys(slots) as Slot[]).every((key) => a[key] === b[key]);
}

/** Viewing a preset never changes installations or ride assignments. */
export function preferredWorkbenchPreset(
	presets: Preset[],
	bikeId: string,
	rememberedId: string | null,
	installed: Configuration,
) {
	const bikePresets = presets.filter((preset) => preset.bikeId === bikeId);
	return (
		bikePresets.find((preset) => preset.id === rememberedId) ??
		bikePresets.find((preset) => sameConfiguration(preset.parts, installed)) ??
		bikePresets[0]
	);
}
