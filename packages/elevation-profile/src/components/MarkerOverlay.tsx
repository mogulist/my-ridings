"use client";

import { usePlotArea, useXAxisScale, useYAxisScale } from "recharts";
import type { ProfileMarker, ProfilePoint, XAxisMode } from "../types";
import { nearestProfilePoint, profilePointToXValue } from "../utils";

const LABEL_TIERS = 3;
const LABEL_ROW_HEIGHT = 13;
const LABEL_CHAR_WIDTH = 7;
const LABEL_GAP_PX = 24;

type Props = {
	markers: ProfileMarker[];
	data: ProfilePoint[];
	xAxisMode: XAxisMode;
};

/**
 * Summit/보급소/컷오프 등 POI 마커를 차트 위에 그리는 recharts 커스텀 컴포넌트.
 * 라벨 충돌 시 최대 3단으로 분산한다.
 */
export function MarkerOverlay({ markers, data, xAxisMode }: Props) {
	const plotArea = usePlotArea();
	const xScale = useXAxisScale();
	const yScale = useYAxisScale();
	if (!plotArea || !xScale || !yScale || markers.length === 0) return null;

	const positioned = markers
		.map((m) => {
			const point = nearestProfilePoint(m.distanceKm, data);
			if (!point) return null;
			const xVal = profilePointToXValue(point, xAxisMode);
			const px = xScale(xVal);
			const py = yScale(point.elevationM);
			if (px == null || py == null) return null;
			return { ...m, px, py };
		})
		.filter((m): m is ProfileMarker & { px: number; py: number } => m !== null)
		.filter((m) => m.px >= plotArea.x && m.px <= plotArea.x + plotArea.width)
		.sort((a, b) => a.px - b.px);

	const tierEndX: number[] = new Array(LABEL_TIERS).fill(-Infinity);
	const tiered = positioned.map((m) => {
		const halfW = (m.label.length * LABEL_CHAR_WIDTH) / 2 + 4;
		let tier = 0;
		while (tier < LABEL_TIERS - 1 && m.px - halfW < tierEndX[tier]) tier++;
		tierEndX[tier] = m.px + halfW;
		return { ...m, tier };
	});

	return (
		<g style={{ pointerEvents: "none" }}>
			{tiered.map((m) => {
				const labelY = plotArea.y - LABEL_GAP_PX - m.tier * LABEL_ROW_HEIGHT - 4;
				const color = m.color ?? "#374151";
				return (
					<g key={m.id}>
						<line
							x1={m.px}
							y1={labelY + 3}
							x2={m.px}
							y2={m.py}
							stroke={color}
							strokeWidth={1}
							strokeDasharray="2 2"
							opacity={0.35}
						/>
						<circle cx={m.px} cy={m.py} r={4} fill="#fff" stroke={color} strokeWidth={2} />
						<text
							x={m.px}
							y={labelY}
							fill={color}
							fontSize={9}
							fontWeight={600}
							textAnchor="middle"
							style={{ userSelect: "none" }}
						>
							{m.label}
						</text>
					</g>
				);
			})}
		</g>
	);
}
