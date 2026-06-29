"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProfilePoint, XAxisMode } from "../types";
import { nearestProfilePoint, profilePointToXValue } from "../utils";

export type KmRange = { startKm: number; endKm: number };

const MIN_SELECTION_KM = 0.1;
const ZOOM_PADDING_RATIO = 0.15;

type UseZoomStateOptions = {
	data: ProfilePoint[];
	xAxisMode: XAxisMode;
	yAxisWidth: number;
	chartMarginRight: number;
	containerRef: React.RefObject<HTMLDivElement | null>;
	onSelectionChange?: (range: KmRange | null) => void;
};

type UseZoomStateReturn = {
	zoomDomain: KmRange | null;
	selection: KmRange | null;
	drag: KmRange | null;
	draggingHandle: "start" | "end" | null;
	clearSelection: () => void;
	handleMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
	setDraggingHandle: (handle: "start" | "end") => void;
	pointAtClientX: (clientX: number, clamp?: boolean) => ProfilePoint | null;
};

/**
 * 드래그 줌 선택 상태를 관리하는 훅.
 * containerRef가 감싸는 div 의 mousedown/mousemove/mouseup 이벤트를 처리한다.
 */
export function useZoomState({
	data,
	xAxisMode,
	yAxisWidth,
	chartMarginRight,
	containerRef,
	onSelectionChange,
}: UseZoomStateOptions): UseZoomStateReturn {
	const [zoomDomain, setZoomDomain] = useState<KmRange | null>(null);
	const [selection, setSelection] = useState<KmRange | null>(null);
	const [drag, setDrag] = useState<KmRange | null>(null);
	const [draggingHandle, setDraggingHandleState] = useState<"start" | "end" | null>(null);

	const clearSelection = useCallback(() => {
		setZoomDomain(null);
		setSelection(null);
		setDrag(null);
	}, []);

	// 알림: selection이 바뀔 때 콜백 호출
	useEffect(() => {
		onSelectionChange?.(selection);
	}, [selection, onSelectionChange]);

	function currentXDomain(): [number, number] | null {
		if (data.length < 2) return null;
		if (zoomDomain) {
			const s = nearestProfilePoint(zoomDomain.startKm, data);
			const e = nearestProfilePoint(zoomDomain.endKm, data);
			if (!s || !e) return null;
			return [profilePointToXValue(s, xAxisMode), profilePointToXValue(e, xAxisMode)];
		}
		return [
			profilePointToXValue(data[0], xAxisMode),
			profilePointToXValue(data[data.length - 1], xAxisMode),
		];
	}

	function clientXToFraction(clientX: number, clamp: boolean): number | null {
		if (!containerRef.current) return null;
		const rect = containerRef.current.getBoundingClientRect();
		const mouseX = clientX - rect.left;
		const plotWidth = rect.width - yAxisWidth - chartMarginRight;
		if (plotWidth <= 0) return null;
		if (!clamp && (mouseX < yAxisWidth || mouseX > yAxisWidth + plotWidth)) return null;
		const fraction = (mouseX - yAxisWidth) / plotWidth;
		return clamp ? Math.min(1, Math.max(0, fraction)) : fraction;
	}

	function pointAtFraction(fraction: number, xMin: number, xMax: number): ProfilePoint | null {
		if (data.length < 2 || xMax === xMin) return null;
		const getX = (p: ProfilePoint) => profilePointToXValue(p, xAxisMode);
		const targetX = xMin + fraction * (xMax - xMin);
		let lo = 0;
		let hi = data.length - 1;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (getX(data[mid]) < targetX) lo = mid + 1;
			else hi = mid;
		}
		const best =
			lo > 0 && Math.abs(getX(data[lo - 1]) - targetX) < Math.abs(getX(data[lo]) - targetX)
				? lo - 1
				: lo;
		return data[best] ?? null;
	}

	function pointAtClientX(clientX: number, clamp = false): ProfilePoint | null {
		const fraction = clientXToFraction(clientX, clamp);
		if (fraction == null) return null;
		const domain = currentXDomain();
		if (!domain) return null;
		return pointAtFraction(fraction, domain[0], domain[1]);
	}

	function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
		if (e.button !== 0 || zoomDomain) return;
		const point = pointAtClientX(e.clientX, true);
		if (!point) return;
		setDrag({ startKm: point.distanceKm, endKm: point.distanceKm });
	}

	// document-level mousemove/mouseup 감시 (drag 또는 draggingHandle 중일 때만)
	// biome-ignore lint/correctness/useExhaustiveDependencies: closures depend on data/xAxisMode via pointAtClientX
	useEffect(() => {
		if (!drag && !draggingHandle) return;

		function handleMove(e: MouseEvent) {
			const point = pointAtClientX(e.clientX, true);
			if (!point) return;

			if (draggingHandle && zoomDomain) {
				const clamped = Math.min(zoomDomain.endKm, Math.max(zoomDomain.startKm, point.distanceKm));
				setSelection((prev) => {
					if (!prev) return prev;
					if (draggingHandle === "start")
						return { startKm: Math.min(clamped, prev.endKm), endKm: prev.endKm };
					return { startKm: prev.startKm, endKm: Math.max(clamped, prev.startKm) };
				});
			} else if (drag) {
				setDrag((prev) => (prev ? { ...prev, endKm: point.distanceKm } : prev));
			}
		}

		function handleUp() {
			if (drag) {
				const startKm = Math.min(drag.startKm, drag.endKm);
				const endKm = Math.max(drag.startKm, drag.endKm);
				if (endKm - startKm >= MIN_SELECTION_KM) {
					const pad = (endKm - startKm) * ZOOM_PADDING_RATIO;
					const dataStart = data[0]?.distanceKm ?? startKm;
					const dataEnd = data[data.length - 1]?.distanceKm ?? endKm;
					setZoomDomain({
						startKm: Math.max(dataStart, startKm - pad),
						endKm: Math.min(dataEnd, endKm + pad),
					});
					setSelection({ startKm, endKm });
				}
				setDrag(null);
			}
			setDraggingHandleState(null);
		}

		document.addEventListener("mousemove", handleMove);
		document.addEventListener("mouseup", handleUp);
		return () => {
			document.removeEventListener("mousemove", handleMove);
			document.removeEventListener("mouseup", handleUp);
		};
	}, [drag, draggingHandle, zoomDomain, data, xAxisMode]);

	function setDraggingHandle(handle: "start" | "end") {
		setDraggingHandleState(handle);
	}

	return {
		zoomDomain,
		selection,
		drag,
		draggingHandle,
		clearSelection,
		handleMouseDown,
		setDraggingHandle,
		pointAtClientX,
	};
}
