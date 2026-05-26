"use client";

import { XIcon } from "lucide-react";
import { useCallback, useEffect, useId } from "react";
import { ClimbGradientDetail } from "./ClimbGradientDetail";
import type { TrackPoint } from "./ElevationProfile";

export type ClimbGradientSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	trackPoints: TrackPoint[];
	startDistanceKm: number;
	endDistanceKm: number;
	title: string;
	subtitle?: string | null;
	endMarkerDistanceKm?: number | null;
};

export function ClimbGradientSheet({
	open,
	onOpenChange,
	trackPoints,
	startDistanceKm,
	endDistanceKm,
	title,
	subtitle = null,
	endMarkerDistanceKm = null,
}: ClimbGradientSheetProps) {
	const titleId = useId();

	const handleClose = useCallback(() => {
		onOpenChange(false);
	}, [onOpenChange]);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") handleClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, handleClose]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/40 sm:items-center sm:justify-center sm:p-4">
			<button
				type="button"
				className="absolute inset-0 cursor-default"
				aria-label="닫기"
				onClick={handleClose}
			/>
			<div
				role="dialog"
				aria-modal
				aria-labelledby={titleId}
				className="relative z-10 flex max-h-[min(88vh,640px)] w-full flex-col rounded-t-2xl border border-border bg-background shadow-2xl sm:max-w-lg sm:rounded-2xl"
			>
				<div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
					<h3 id={titleId} className="text-sm font-semibold text-foreground">
						경사 프로필
					</h3>
					<button
						type="button"
						onClick={handleClose}
						className="rounded-md p-1 text-muted-foreground hover:bg-muted"
						aria-label="닫기"
					>
						<XIcon className="size-4" aria-hidden />
					</button>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
					<ClimbGradientDetail
						title={title}
						subtitle={subtitle}
						trackPoints={trackPoints}
						startDistanceKm={startDistanceKm}
						endDistanceKm={endDistanceKm}
						endMarkerDistanceKm={endMarkerDistanceKm}
						chartHeightPx={220}
					/>
				</div>
			</div>
		</div>
	);
}
