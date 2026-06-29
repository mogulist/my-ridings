"use client";

import { usePlotArea, useXAxisScale } from "recharts";
import type { ProfilePoint, XAxisMode } from "../types";
import { nearestProfilePoint, profilePointToXValue } from "../utils";

const FILL = "rgba(59,130,246,0.12)";
const HANDLE_COLOR = "#3b82f6";
const HANDLE_W = 2;
const HANDLE_HIT_W = 12;

type KmRange = { startKm: number; endKm: number };

type Props = {
	range: KmRange | null;
	showHandles: boolean;
	xAxisMode: XAxisMode;
	data: ProfilePoint[];
	onHandleMouseDown: (handle: "start" | "end") => void;
};

/**
 * 드래그 선택 구간 음영 + 줌 핸들을 그리는 recharts 커스텀 컴포넌트.
 * range는 distanceKm 기준으로 전달받고 내부에서 x축 픽셀로 변환한다.
 */
export function SelectionOverlay({
	range,
	showHandles,
	xAxisMode,
	data,
	onHandleMouseDown,
}: Props) {
	const plotArea = usePlotArea();
	const xScale = useXAxisScale();
	if (!plotArea || !xScale || !range) return null;

	const lo = Math.min(range.startKm, range.endKm);
	const hi = Math.max(range.startKm, range.endKm);
	const startPt = nearestProfilePoint(lo, data);
	const endPt = nearestProfilePoint(hi, data);
	if (!startPt || !endPt) return null;

	const x1 = xScale(profilePointToXValue(startPt, xAxisMode));
	const x2 = xScale(profilePointToXValue(endPt, xAxisMode));
	if (x1 == null || x2 == null) return null;

	const left = Math.min(x1, x2);
	const width = Math.abs(x2 - x1);

	return (
		<g>
			<rect
				x={left}
				y={plotArea.y}
				width={width}
				height={plotArea.height}
				fill={FILL}
				style={{ pointerEvents: "none" }}
			/>
			{showHandles && (
				<>
					{/* biome-ignore lint/a11y/noStaticElementInteractions: SVG handle */}
					<g
						style={{ cursor: "ew-resize" }}
						onMouseDown={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onHandleMouseDown("start");
						}}
					>
						<rect
							x={x1 - HANDLE_HIT_W / 2}
							y={plotArea.y}
							width={HANDLE_HIT_W}
							height={plotArea.height}
							fill="transparent"
						/>
						<rect
							x={x1 - HANDLE_W / 2}
							y={plotArea.y}
							width={HANDLE_W}
							height={plotArea.height}
							fill={HANDLE_COLOR}
							style={{ pointerEvents: "none" }}
						/>
					</g>
					{/* biome-ignore lint/a11y/noStaticElementInteractions: SVG handle */}
					<g
						style={{ cursor: "ew-resize" }}
						onMouseDown={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onHandleMouseDown("end");
						}}
					>
						<rect
							x={x2 - HANDLE_HIT_W / 2}
							y={plotArea.y}
							width={HANDLE_HIT_W}
							height={plotArea.height}
							fill="transparent"
						/>
						<rect
							x={x2 - HANDLE_W / 2}
							y={plotArea.y}
							width={HANDLE_W}
							height={plotArea.height}
							fill={HANDLE_COLOR}
							style={{ pointerEvents: "none" }}
						/>
					</g>
				</>
			)}
		</g>
	);
}
