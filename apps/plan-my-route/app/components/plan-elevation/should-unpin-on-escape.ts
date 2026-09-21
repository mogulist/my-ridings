type ShouldUnpinElevationTooltipOnEscapeInput = {
	key: string;
	isPinned: boolean;
	isStageEndBoundaryOverlayActive: boolean;
	hasOpenDialog: boolean;
	isPointerOverElevationProfile: boolean;
};

export function shouldUnpinElevationTooltipOnEscape({
	key,
	isPinned,
	isStageEndBoundaryOverlayActive,
	hasOpenDialog,
	isPointerOverElevationProfile,
}: ShouldUnpinElevationTooltipOnEscapeInput): boolean {
	if (key !== "Escape") return false;
	if (!isPinned) return false;
	if (isStageEndBoundaryOverlayActive) return false;
	if (hasOpenDialog) return false;
	if (!isPointerOverElevationProfile) return false;
	return true;
}

export function hasOpenDialogElement(root: ParentNode = document): boolean {
	return root.querySelector('[role="dialog"], [aria-modal="true"]') != null;
}
