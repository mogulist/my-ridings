"use client";

import type { GradientSegment } from "@my-ridings/plan-geometry";
import { usePlotArea, useXAxisScale } from "recharts";
import { DOWNHILL_COLOR } from "../colors";

const STRIP_HEIGHT = 8;

type Props = {
	segments: GradientSegment[];
	/** 플롯 영역 하단에서 스트립 상단까지의 간격(px). 기본 18 (x축 눈금 아래). 1이면 0선 바로 아래. */
	topGap?: number;
};

/** 차트 x축 아래에 경사도 색상 띠를 그리는 recharts 커스텀 컴포넌트. */
export function GradientStrip({ segments, topGap = 18 }: Props) {
	const plotArea = usePlotArea();
	const xScale = useXAxisScale();
	if (!plotArea || !xScale || plotArea.width <= 0) return null;

	const { x, y, width, height } = plotArea;
	const stripY = y + height + topGap;

	return (
		<g>
			<defs>
				<clipPath id="ep-grad-strip">
					<rect x={x} y={stripY} width={width} height={STRIP_HEIGHT} rx={2} />
				</clipPath>
			</defs>
			<g clipPath="url(#ep-grad-strip)">
				{segments.map((seg, i) => {
					if (seg.color === DOWNHILL_COLOR) return null;
					const x1 = xScale(seg.startKm);
					const x2 = xScale(seg.endKm);
					if (x1 == null || x2 == null || x2 <= x1) return null;
					return (
						<rect
							// biome-ignore lint/suspicious/noArrayIndexKey: segments are positional
							key={i}
							x={x1}
							y={stripY}
							width={x2 - x1}
							height={STRIP_HEIGHT}
							fill={seg.color}
						/>
					);
				})}
			</g>
		</g>
	);
}
