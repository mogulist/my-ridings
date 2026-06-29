"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchRaceRecordsBlob,
  raceRecordsBlobQueryKey,
} from "@/lib/race-records-blob-query";
import type { Event, EventYearStatsWithCourses, RaceRecord } from "@/lib/types";
import { StatsChart, type RaceRecordsClientState } from "./StatsChart";

type Props = {
  event: Event;
  yearlyStats: EventYearStatsWithCourses[];
};

const BLOB_STALE_MS = Number.POSITIVE_INFINITY;
const BLOB_GC_MS = 1000 * 60 * 60 * 24 * 7;

export function EventYearTabs({ event, yearlyStats }: Props) {
  const hasYearStats = yearlyStats.length > 0;
  const defaultYearStr = hasYearStats ? String(yearlyStats[0].year) : "";
  const [tab, setTab] = React.useState(defaultYearStr);
  const queryClient = useQueryClient();

  const activeYear = hasYearStats ? Number(tab) : 0;
  const activeBlobUrl =
    event.yearDetails[activeYear]?.recordsBlobUrl?.trim() ?? "";
  const activeKomBlobUrl =
    event.yearDetails[activeYear]?.komRecordsBlobUrl?.trim() ?? "";

  const recordsQuery = useQuery({
    queryKey: raceRecordsBlobQueryKey(event.id, activeYear, "full"),
    queryFn: ({ signal }) => fetchRaceRecordsBlob(activeBlobUrl, signal),
    enabled: hasYearStats && Boolean(activeBlobUrl),
    staleTime: BLOB_STALE_MS,
    gcTime: BLOB_GC_MS,
  });

  const komRecordsQuery = useQuery({
    queryKey: raceRecordsBlobQueryKey(event.id, activeYear, "kom"),
    queryFn: ({ signal }) => fetchRaceRecordsBlob(activeKomBlobUrl, signal),
    enabled: hasYearStats && Boolean(activeKomBlobUrl),
    staleTime: BLOB_STALE_MS,
    gcTime: BLOB_GC_MS,
  });

  const {
    data: recordsData,
    isError,
    isLoading,
  } = recordsQuery;
  const {
    data: komRecordsData,
    isError: komIsError,
    isLoading: komIsLoading,
  } = komRecordsQuery;

  const getRaceRecordsState = React.useCallback(
    (year: number): RaceRecordsClientState => {
      const blobUrl = event.yearDetails[year]?.recordsBlobUrl?.trim() ?? "";
      if (!blobUrl) return { status: "no_blob" };

      if (year === activeYear) {
        if (!activeBlobUrl) return { status: "no_blob" };
        if (recordsData !== undefined)
          return { status: "loaded", records: recordsData };
        if (isError) return { status: "error" };
        if (isLoading) return { status: "loading" };
        return { status: "pending" };
      }

      const cached = queryClient.getQueryData<RaceRecord[]>(
        raceRecordsBlobQueryKey(event.id, year, "full"),
      );
      if (cached !== undefined) return { status: "loaded", records: cached };

      return { status: "pending" };
    },
    [
      event.id,
      event.yearDetails,
      activeYear,
      activeBlobUrl,
      queryClient,
      recordsData,
      isError,
      isLoading,
    ],
  );

  const getKomRaceRecordsState = React.useCallback(
    (year: number): RaceRecordsClientState => {
      const komUrl =
        event.yearDetails[year]?.komRecordsBlobUrl?.trim() ?? "";
      if (!komUrl) return { status: "no_blob" };

      if (year === activeYear) {
        if (!activeKomBlobUrl) return { status: "no_blob" };
        if (komRecordsData !== undefined)
          return { status: "loaded", records: komRecordsData };
        if (komIsError) return { status: "error" };
        if (komIsLoading) return { status: "loading" };
        return { status: "pending" };
      }

      const cached = queryClient.getQueryData<RaceRecord[]>(
        raceRecordsBlobQueryKey(event.id, year, "kom"),
      );
      if (cached !== undefined) return { status: "loaded", records: cached };

      return { status: "pending" };
    },
    [
      event.id,
      event.yearDetails,
      activeYear,
      activeKomBlobUrl,
      queryClient,
      komRecordsData,
      komIsError,
      komIsLoading,
    ],
  );

  if (!hasYearStats) return null;

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <div className="sticky top-12 z-40 -mx-4 bg-background px-4 py-2 sm:mx-0 sm:px-0">
        <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="flex w-max min-w-full flex-nowrap justify-start gap-0 sm:inline-flex sm:w-auto sm:min-w-0 sm:gap-1">
            {yearlyStats.map(({ year }) => (
              <TabsTrigger
                key={year}
                value={String(year)}
                className="min-w-[76px] flex-1 whitespace-nowrap px-3 sm:flex-none sm:min-w-[88px] sm:px-5"
              >
                {year}년
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </div>
      {yearlyStats.map((yearData) => {
        const yearDetail = event.yearDetails[yearData.year];
        const courses = yearDetail?.courses;
        return (
          <TabsContent
            key={yearData.year}
            value={String(yearData.year)}
            className="mt-6"
          >
            <StatsChart
              statistics={[yearData]}
              event={event}
              eventId={event.id}
              courses={courses}
              getRaceRecordsState={getRaceRecordsState}
              getKomRaceRecordsState={getKomRaceRecordsState}
            />
            {yearDetail?.notice && (
              <div className="mt-6 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                {yearDetail.notice}
              </div>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
