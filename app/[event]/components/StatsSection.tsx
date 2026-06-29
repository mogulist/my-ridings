import path from "path";
import type { Event } from "@/lib/types";
import { EventYearTabs } from "./EventYearTabs";
import { getYearStatsWithCourses } from "@/lib/stats";

type Props = {
  event: Event;
};

export const StatsSection = async ({ event }: Props) => {
  const dataDir = path.join(process.cwd(), "data");
  const yearlyStats = await getYearStatsWithCourses(event, dataDir);

  return (
    <section aria-label="연도별 기록 분포" className="w-full">
      <EventYearTabs event={event} yearlyStats={yearlyStats} />
    </section>
  );
};
