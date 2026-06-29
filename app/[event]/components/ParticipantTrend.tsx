"use client";

import type { EventYear } from "@/lib/types";
import { useRef, useState } from "react";
import { useMobile } from "@/hooks/use-mobile";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChartIcon, TableIcon } from "lucide-react";
import { CourseTrendSection } from "@/components/CourseTrendSection";
import { EventParticipantTrends } from "@/lib/participants";

type Props = {
  eventData: EventParticipantTrends;
};

export function ParticipantTrend({ eventData }: Props) {
  const isMobile = useMobile();
  const isTablet = useMobile(1024); // 1024px 미만을 태블릿으로 간주
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewType, setViewType] = useState<"chart" | "table">("chart");

  // 모바일에서의 차트 너비 계산
  const chartWidth = isMobile ? 100 : 120; // 각 연도별 차트의 너비 (간격 좁힘)
  const candidateWidth = eventData.length * chartWidth;
  const totalWidth = candidateWidth < 360 ? 360 : candidateWidth; // 전체 스크롤 영역 너비

  return (
    <div className="h-full w-full">
      <div className="flex justify-end mb-4">
        <Tabs
          defaultValue="chart"
          className="w-[180px]"
          onValueChange={(value) => setViewType(value as "chart" | "table")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chart">
              <BarChartIcon className="h-4 w-4 mr-1" />
              <span>차트</span>
            </TabsTrigger>
            <TabsTrigger value="table">
              <TableIcon className="h-4 w-4 mr-1" />
              <span>테이블</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div
        className={`${
          isTablet ? "flex flex-col space-y-6" : "grid grid-cols-2 gap-8"
        } px-4`}
      >
        {eventData.map((course) => (
          <CourseTrendSection
            key={course.id}
            title={course.name}
            data={course.yearlyData.map((d) => ({
              year: d.year,
              registered: d.registered,
              participants: d.participants,
              dnf: d.dnf,
              rate: d.participationRate,
              completionRate: d.completionRate,
            }))}
            viewType={viewType}
            isMobile={isMobile}
            isTablet={isTablet}
            scrollRef={scrollRef}
            totalWidth={totalWidth}
            config={{
              registered: { label: "등록자", color: "hsl(215, 90%, 80%)" },
              participants: { label: "참가자", color: "hsl(215, 90%, 50%)" },
              dnf: { label: "DNF", color: "hsl(0, 80%, 60%)" },
            }}
          />
        ))}
      </div>
    </div>
  );
}
