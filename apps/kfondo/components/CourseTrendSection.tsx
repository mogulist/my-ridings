import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import React from "react";

type Props = {
  title: string;
  data: {
    year: number;
    registered: number;
    participants: number;
    dnf: number;
    rate: string;
    completionRate: string;
  }[];
  viewType: "chart" | "table";
  isMobile: boolean;
  isTablet: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  totalWidth: number;
  config: Record<string, { label: string; color: string }>;
};

export const CourseTrendSection = ({
  title,
  data,
  viewType,
  isMobile,
  isTablet,
  scrollRef,
  totalWidth,
  config,
}: Props) => {
  return (
    <div className="w-full">
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      {viewType === "chart" ? (
        isMobile ? (
          <MobileChart
            data={data}
            scrollRef={scrollRef}
            totalWidth={totalWidth}
            config={config}
          />
        ) : (
          <DesktopChart data={data} config={config} />
        )
      ) : (
        <TableSection data={data} />
      )}
    </div>
  );
};

const MobileChart = ({ data, scrollRef, totalWidth, config }: any) => (
  <div
    ref={scrollRef}
    className="relative overflow-x-auto pb-6 hide-scrollbar"
    style={{ overscrollBehavior: "contain" }}
  >
    <div style={{ width: `${totalWidth}px` }}>
      <ChartContainer config={config}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
          barSize={24}
          barGap={2}
          width={totalWidth}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="year"
            tickFormatter={(value) => `${value}년`}
            height={35}
          />
          <YAxis type="number" domain={[0, "dataMax + 100"]} width={45} />
          <ChartTooltip content={<CustomTooltip />} />
          <Bar
            name="등록자"
            dataKey="registered"
            fill="var(--color-registered)"
          />
          <Bar
            name="참가자"
            dataKey="participants"
            fill="var(--color-participants)"
          />
          <Bar name="DNF" dataKey="dnf" fill="var(--color-dnf)" />
          <Legend content={CustomLegend} verticalAlign="bottom" height={36} />
        </BarChart>
      </ChartContainer>
    </div>
  </div>
);

const DesktopChart = ({ data, config }: any) => (
  <ChartContainer config={config}>
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 16, left: 16, bottom: 20 }}
        barSize={20}
        barGap={2}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="year"
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `${value}년`}
          height={35}
        />
        <YAxis tick={{ fontSize: 12 }} width={45} />
        <ChartTooltip content={<CustomTooltip />} />
        <Bar
          name="등록자"
          dataKey="registered"
          fill="var(--color-registered)"
        />
        <Bar
          name="참가자"
          dataKey="participants"
          fill="var(--color-participants)"
        />
        <Bar name="DNF" dataKey="dnf" fill="var(--color-dnf)" />
        <Legend content={CustomLegend} verticalAlign="bottom" height={36} />
      </BarChart>
    </ResponsiveContainer>
  </ChartContainer>
);

const TableSection = ({ data }: any) => (
  <div className="h-[250px] overflow-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">연도</TableHead>
          <TableHead>등록자</TableHead>
          <TableHead>참가자</TableHead>
          <TableHead>DNF</TableHead>
          <TableHead className="text-right">참가율</TableHead>
          <TableHead className="text-right">완주율</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item: any) => (
          <TableRow key={item.year}>
            <TableCell className="font-medium">{item.year}년</TableCell>
            <TableCell>{item.registered}명</TableCell>
            <TableCell>{item.participants}명</TableCell>
            <TableCell>{item.dnf}명</TableCell>
            <TableCell className="text-right">
              {item.registered > 0 ? `${item.rate}%` : "-"}
            </TableCell>
            <TableCell className="text-right">{item.completionRate}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

const LEGEND_ORDER = ["registered", "participants", "dnf"] as const;

// 커스텀 범례 렌더러 (Recharts 기본 payload 순서가 뒤섞일 수 있어 고정)
const CustomLegend = (props: any) => {
  const { payload } = props;
  if (!payload || payload.length === 0) return null;
  const ordered = [...payload].sort(
    (a, b) =>
      LEGEND_ORDER.indexOf(a.dataKey as (typeof LEGEND_ORDER)[number]) -
      LEGEND_ORDER.indexOf(b.dataKey as (typeof LEGEND_ORDER)[number])
  );
  return (
    <div className="flex flex-wrap justify-center gap-4 text-sm mt-2">
      {ordered.map((entry: any, index: number) => (
        <div key={`item-${entry.dataKey ?? index}`} className="flex items-center gap-1">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span>{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

const tooltipValue = (payload: any[] | undefined, dataKey: string) =>
  payload?.find((p) => p.dataKey === dataKey)?.value ?? 0;

// 커스텀 툴팁 컴포넌트
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const registered = tooltipValue(payload, "registered");
    const participants = tooltipValue(payload, "participants");
    const dnf = tooltipValue(payload, "dnf");
    const participationRate =
      registered > 0 ? ((participants / registered) * 100).toFixed(1) : "-";
    const completionRate =
      dnf > 0
        ? (((participants - dnf) / participants) * 100).toFixed(1)
        : "100.0";

    return (
      <div className="bg-background border border-border rounded-md shadow-md p-3 text-sm">
        <p className="font-medium mb-1">{`${label}년`}</p>
        <p className="text-xs mb-1">{`등록자: ${registered}명`}</p>
        <p className="text-xs mb-1">{`참가자: ${participants}명`}</p>
        {dnf > 0 && <p className="text-xs mb-1">{`DNF: ${dnf}명`}</p>}
        <p className="text-xs font-medium">{`참가율: ${
          participationRate === "-" ? "-" : participationRate + "%"
        }`}</p>
        <p className="text-xs font-medium">{`완주율: ${completionRate}%`}</p>
      </div>
    );
  }
  return null;
};
