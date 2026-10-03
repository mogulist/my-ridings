import { getTranslations } from "next-intl/server";
import path from "path";
import type { Event } from "@/lib/types";
import { EventYearTabs } from "./EventYearTabs";
import { getYearStatsWithCourses } from "@/lib/stats";

type Props = {
  event: Event;
};

export const StatsSection = async ({ event }: Props) => {
  const t = await getTranslations();

  const dataDir = path.join(process.cwd(), "data");
  const yearlyStats = await getYearStatsWithCourses(event, dataDir);

  return (
    <section aria-label={t("stats.yearlyDistribution")} className="w-full">
      <EventYearTabs event={event} yearlyStats={yearlyStats} />
    </section>
  );
};
