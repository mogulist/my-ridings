type ShouldUnpinElevationTooltipOnEscapeInput = {
	key: string;
	isPinned: boolean;
	isStageEndBoundaryOverlayActive: boolean;
	hasOpenDialog: boolean;
};

export function shouldUnpinElevationTooltipOnEscape({
	key,
	isPinned,
	isStageEndBoundaryOverlayActive,
	hasOpenDialog,
}: ShouldUnpinElevationTooltipOnEscapeInput): boolean {
	if (key !== "Escape") return false;
	if (!isPinned) return false;
	if (isStageEndBoundaryOverlayActive) return false;
	if (hasOpenDialog) return false;
	return true;
}

export function hasOpenDialogElement(root: ParentNode = document): boolean {
	return root.querySelector('[role="dialog"], [aria-modal="true"]') != null;
}
