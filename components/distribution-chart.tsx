import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import React from "react";
export type DistributionChartProps = {
  /** 접근성용(차트 영역 라벨). 헤더는 `toolbar`에서 렌더링합니다. */
  ariaLabel: string;
  toolbar: React.ReactNode;
  data: any[];
  color: string;
  interval: number;
  isMobile: boolean;
  comment?: string;
  formatXAxisTick: (
    value: string,
    isMobile: boolean,
    interval: number,
  ) => string;
  CustomTooltip: React.FC<any>;
};

export function DistributionChart({
  ariaLabel,
  toolbar,
  data,
  color,
  interval,
  isMobile,
  comment,
  formatXAxisTick,
  CustomTooltip,
}: DistributionChartProps) {
  return (
    <div className="flex w-full flex-col">
      <div className="mb-4">{toolbar}</div>
      <div
        role="img"
        aria-label={ariaLabel}
        className={`${isMobile ? "h-[300px]" : "h-[360px]"} w-full${
          isMobile ? " overflow-x-auto overscroll-contain touch-pan-x" : ""
        }`}
      >
        <ChartContainer
          config={{
            participants: {
              label: "참가자 수",
              color,
            },
          }}
          className="h-full w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 10,
                right: isMobile ? 10 : 30,
                left: isMobile ? 0 : 0,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timeRange"
                angle={-45}
                textAnchor="end"
                height={isMobile ? 80 : 70}
                tick={{ fontSize: isMobile ? 11 : 12 }}
                tickMargin={10}
                tickFormatter={(value) =>
                  formatXAxisTick(value, isMobile, interval)
                }
                interval={0}
                minTickGap={0}
                label={{
                  value: "기록",
                  position: "insideBottom",
                  offset: 20,
                  style: { textAnchor: "middle" },
                }}
              />
              <YAxis
                tick={{ fontSize: isMobile ? 11 : 12 }}
                width={isMobile ? 40 : 40}
                label={{
                  value: "인원",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <ChartTooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                name="참가자 수"
                dataKey="participants"
                stroke={color}
                fill={color}
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
      {comment ? (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {comment}
        </p>
      ) : null}
    </div>
  );
}
