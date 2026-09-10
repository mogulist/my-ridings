import { describe, expect, test } from "bun:test";
import { shouldUnpinElevationTooltipOnEscape } from "./should-unpin-on-escape";

describe("shouldUnpinElevationTooltipOnEscape", () => {
	const pinnedIdle = {
		key: "Escape",
		isPinned: true,
		isStageEndBoundaryOverlayActive: false,
		hasOpenDialog: false,
	};

	test("Escape unpins when tooltip is pinned and no overlay is open", () => {
		expect(shouldUnpinElevationTooltipOnEscape(pinnedIdle)).toBe(true);
	});

	test("does not unpin for other keys", () => {
		expect(shouldUnpinElevationTooltipOnEscape({ ...pinnedIdle, key: "Enter" })).toBe(false);
	});

	test("does not unpin when tooltip is not pinned", () => {
		expect(shouldUnpinElevationTooltipOnEscape({ ...pinnedIdle, isPinned: false })).toBe(false);
	});

	test("does not unpin when a dialog is open", () => {
		expect(shouldUnpinElevationTooltipOnEscape({ ...pinnedIdle, hasOpenDialog: true })).toBe(
			false,
		);
	});

	test("does not unpin when stage end boundary overlay is active", () => {
		expect(
			shouldUnpinElevationTooltipOnEscape({
				...pinnedIdle,
				isStageEndBoundaryOverlayActive: true,
			}),
		).toBe(false);
	});
});
