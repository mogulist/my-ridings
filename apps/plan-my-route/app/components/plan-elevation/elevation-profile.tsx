"use client";

import { useState } from "react";
import { ClimbCard } from "./climb-card";
import { CourseBriefingModal } from "./course-briefing";
import { DayStagePillChips, ElevationProfileHeader } from "./day-chips";
import { ElevationAreaChart } from "./elevation-area-chart";
import { ElevationProfileEmpty } from "./elevation-profile-empty";
import { StageBoundaryOverlay } from "./stage-boundary-overlay";
import { StageEditPreviewToolbar } from "./stage-edit-preview-toolbar";
import {
	ClimbHoverTooltip,
	ElevationHoverTooltip,
	ScheduleSelectionKmEleTooltip,
} from "./tooltips";
import type { ElevationProfileProps } from "./types";
import { useElevationProfileState } from "./use-elevation-profile-state";

export function ElevationProfile(props: ElevationProfileProps) {
	const state = useElevationProfileState(props);
	const [courseBriefingOpen, setCourseBriefingOpen] = useState(false);

	if (state.isEmpty) {
		return (
			<ElevationProfileEmpty
				hideChips={state.hideChips}
				alwaysShowChips={state.alwaysShowChips}
				hasStages={state.hasStages}
				stages={props.stages ?? []}
				selectedDayNumber={state.selectedDayNumber}
				onSelectedDayChange={state.onSelectedDayChange}
				chartHeightPx={state.chartHeightPx}
			/>
		);
	}

	return (
		<div
			className={
				state.chartHeightPx != null
					? state.tightFixedHeightChart
						? "flex w-full flex-col gap-1 pl-1 pr-2 pt-1.5"
						: "flex w-full flex-col gap-1 px-2 pt-2"
					: "flex h-full w-full flex-col gap-1 px-2 pt-2"
			}
		>
			{state.hideChips ? null : state.alwaysShowChips && state.hasStages ? (
				<DayStagePillChips
					stages={props.stages ?? []}
					selectedDayNumber={state.selectedDayNumber}
					onSelectedDayChange={state.onSelectedDayChange}
				/>
			) : (
				<ElevationProfileHeader
					totalKm={state.totalKm}
					stages={props.stages ?? []}
					selectedDayNumber={state.selectedDayNumber}
					activeStageId={state.activeStageId}
					onSelectedDayChange={state.onSelectedDayChange}
					onPlayCourseBriefing={() => setCourseBriefingOpen(true)}
				/>
			)}

			{state.climbProfile ? (
				<ClimbCard
					summitName={state.focusedSummit?.name ?? "고개"}
					profile={state.climbProfile}
					onDismiss={
						!state.disablePinAndHoverScrub
							? () => state.setClimbZoomSummitKey(null)
							: undefined
					}
					climbRange={state.effectiveClimbRange}
					onClimbRangeChange={state.setClimbRange}
					visibleModes={state.visibleClimbModes}
				/>
			) : null}

			<div
				ref={state.chartContainerRef}
				className={
					state.chartHeightPx != null
						? "relative w-full shrink-0 overflow-visible"
						: "relative min-h-0 flex-1 overflow-visible"
				}
				style={state.chartHeightPx != null ? { height: state.chartHeightPx } : undefined}
			>
				{state.pendingStageEdit != null ? (
					<StageEditPreviewToolbar
						onDiscardPreview={state.onDiscardPreview}
						onCommitPreview={state.onCommitPreview}
					/>
				) : null}
				<ElevationAreaChart
					chartHeightPx={state.chartHeightPx}
					chartData={state.chartData}
					effectiveChartMargin={state.effectiveChartMargin}
					chartInteractionDisabled={state.chartInteractionDisabled}
					handleMouseMove={state.handleMouseMove}
					handleMouseLeave={state.handleMouseLeave}
					handleChartClick={state.handleChartClick}
					stages={props.stages ?? []}
					activeStageId={state.activeStageId}
					hasStages={state.hasStages}
					stageKeys={state.stageKeys}
					selectedDayNumber={state.selectedDayNumber}
					visibleStart={state.visibleStart}
					visibleEnd={state.visibleEnd}
					climbProfile={state.climbProfile}
					climbGradientFillStops={state.climbGradientFillStops}
					showGradientStrip={state.showGradientStrip}
					gradientSegments={state.gradientSegments}
					tightFixedHeightChart={state.tightFixedHeightChart}
					compactYAxis={props.compactYAxis ?? false}
					stageBoundaries={state.stageBoundaries}
					isHoveringStageEndBoundary={state.isHoveringStageEndBoundary}
					selectedStage={state.selectedStage}
					pendingStageEdit={state.pendingStageEdit}
					pendingStage={state.pendingStage}
					visibleCPs={state.visibleCPs}
					visibleSummits={state.visibleSummits}
					cpNameVisible={state.cpNameVisible}
					summitNameVisible={state.summitNameVisible}
					labelRowByKey={state.labelRowByKey}
					planPoiFocusInView={state.planPoiFocusInView}
					scheduleMarkerFocus={state.scheduleMarkerFocus}
					scheduleSelectionOverlay={state.scheduleSelectionOverlay}
					currentChartDatum={state.currentChartDatum}
					effectiveClimbZoomSummitKey={state.effectiveClimbZoomSummitKey}
					handleSummitClick={state.handleSummitClick}
				/>
				{state.scheduleSelectionOverlay != null && state.scheduleTooltipStyle != null ? (
					<ScheduleSelectionKmEleTooltip
						km={state.scheduleSelectionOverlay.km}
						ele={state.scheduleSelectionOverlay.ele}
						compactTooltip={state.compactTooltip}
						style={{
							left: state.scheduleTooltipStyle.left,
							top: state.scheduleTooltipStyle.top,
							transform: state.scheduleTooltipStyle.transform,
						}}
					/>
				) : null}
				{!state.chartInteractionDisabled &&
				state.currentChartDatum != null &&
				state.hoverTooltipPlacementStyle != null ? (
					state.climbProfile != null ? (
						<ClimbHoverTooltip
							datum={state.currentChartDatum}
							climbProfile={state.climbProfile}
							trackPoints={state.trackPoints}
							elevationCalibratedThreshold={state.elevationCalibratedThreshold}
							compactTooltip={state.compactTooltip}
							pinned={state.isPinned}
							placementStyle={state.hoverTooltipPlacementStyle}
							onUnpin={state.onUnpin}
							gradientPct={state.hoveredGradientPct}
						/>
					) : (
						<ElevationHoverTooltip
							datum={state.currentChartDatum}
							trackPoints={state.trackPoints}
							cpMarkers={state.cpMarkers}
							elevationCalibratedThreshold={state.elevationCalibratedThreshold}
							cpAnchorMinKm={state.tooltipCpAnchorKm}
							cpAnchorMaxKm={state.tooltipCpAnchorMaxKm}
							anchorFallbackDayNumber={state.tooltipAnchorDayNumber}
							compactTooltip={state.compactTooltip}
							pinned={state.isPinned}
							placementStyle={state.hoverTooltipPlacementStyle}
							onUnpin={state.onUnpin}
						/>
					)
				) : null}
				{state.canDragBoundary &&
				state.selectedStage &&
				state.stageEndBoundaryHitLeftPct != null ? (
					<StageBoundaryOverlay
						selectedStage={state.selectedStage}
						stageEndBoundaryHitLeftPct={state.stageEndBoundaryHitLeftPct}
						stageEndBoundaryChartEditMode={state.stageEndBoundaryChartEditMode}
						stageEndBoundaryMenuAnchor={state.stageEndBoundaryMenuAnchor}
						stageEndBoundaryMenuPosition={state.stageEndBoundaryMenuPosition}
						onHoverBoundary={state.setIsHoveringStageEndBoundary}
						onDismissMenu={() => state.setStageEndBoundaryMenuAnchor(null)}
						onOpenMenuAnchor={state.setStageEndBoundaryMenuAnchor}
						onStartBoundaryDrag={state.onStartBoundaryDrag}
						onStageEndBoundaryEditMapCenter={state.onStageEndBoundaryEditMapCenter}
						beginBoundaryWindowDrag={state.beginBoundaryWindowDrag}
						pendingStageEdit={state.pendingStageEdit}
						pendingStage={state.pendingStage}
						previewStageStats={state.previewStageStats}
						boundaryKmForHandle={state.boundaryKmForHandle}
						visibleStart={state.visibleStart}
						visibleEnd={state.visibleEnd}
						stageEndBoundaryHitStripRef={state.stageEndBoundaryHitStripRef}
						stageEndBoundaryMenuRef={state.stageEndBoundaryMenuRef}
						chartContainerRef={state.chartContainerRef}
					/>
				) : null}
			</div>

			<CourseBriefingModal
				open={courseBriefingOpen}
				onClose={() => setCourseBriefingOpen(false)}
				trackPoints={state.trackPoints}
				summitMarkers={props.summitMarkers ?? []}
				stages={props.stages ?? []}
				selectedDayNumber={state.selectedDayNumber}
				totalKm={state.totalKm}
				elevationCalibratedThreshold={props.elevationCalibratedThreshold}
			/>
		</div>
	);
}
