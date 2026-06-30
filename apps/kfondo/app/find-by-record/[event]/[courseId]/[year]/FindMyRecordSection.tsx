"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RecordInput, { isValidRecordFormat } from "./RecordInput";
import type { Event } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import posthog from "posthog-js";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type RecordScope = "full" | "kom";

type Props = {
  event: Event;
  eventName: string;
  courseId: string;
  year: string;
  initialScope: RecordScope;
};

const RECORD_SCOPE_ITEMS: readonly { scope: RecordScope; label: string }[] = [
  { scope: "full", label: "전체" },
  { scope: "kom", label: "KOM" },
] as const;

const SCOPE_HELPER_TEXT: Record<RecordScope, string> = {
  full: "완주(출발~도착) 기록으로 순위를 확인합니다.",
  kom: "구간(KOM) 기록으로 순위를 확인합니다.",
};

const FindMyRecordSection = ({
  event,
  eventName,
  courseId,
  year,
  initialScope,
}: Props) => {
  const [record, setRecord] = useState("");
  const [error, setError] = useState("");
  const [recordScope, setRecordScope] = useState<RecordScope>(initialScope);
  const router = useRouter();

  const handleRecordChange = (value: string) => {
    setRecord(value);
    if (value && !isValidRecordFormat(value)) {
      setError("올바른 시간 형식이 아닙니다. 예: 05:08:27 또는 05:08:27.53");
    } else {
      setError("");
    }
  };

  // HH:mm:ss(.SS) → digit string 변환
  const toDigitString = (value: string) => {
    return value.replace(/[^\d]/g, "");
  };

  const yearDetail = event.yearDetails[Number(year)];
  const courseInfo = yearDetail?.courses.find((course) => course.id === courseId);
  const hasKomBlob = Boolean(yearDetail?.komSortedRecordsBlobUrl?.trim());
  const courseAllowsKom = hasKomBlob && courseInfo?.hasKom === true;
  const activeScope: RecordScope =
    courseAllowsKom && recordScope === "kom" ? "kom" : "full";

  return (
    <div className="max-w-full px-4 py-4">
      <div className="text-xl text-muted-foreground font-semibold mb-4">
        {year}년 {eventName}
      </div>
      {courseInfo && (
        <div className="flex gap-2">
          <Badge className="bg-blue-600 text-white">{courseInfo.name}</Badge>
          <Badge className="bg-green-600 text-white">
            {courseInfo.distance}km
          </Badge>
          {typeof courseInfo.elevation === "number" && (
            <Badge className="bg-orange-500 text-white">
              {courseInfo.elevation}m
            </Badge>
          )}
        </div>
      )}
      {courseAllowsKom ? (
        <div className="mt-3">
          <ToggleGroup
            type="single"
            value={activeScope}
            onValueChange={(value) => {
              if (!value) return;
              setRecordScope(value as RecordScope);
            }}
            size="sm"
            className="w-fit justify-start gap-0 rounded-md bg-muted/60 p-0.5 text-muted-foreground"
            aria-label="기록 구간"
          >
            {RECORD_SCOPE_ITEMS.map(({ scope, label }) => (
              <ToggleGroupItem
                key={`record-scope-${scope}`}
                value={scope}
                className="h-7 min-h-7 rounded-sm border border-transparent bg-transparent px-2.5 py-0 text-sm font-medium leading-none shadow-none ring-offset-0 hover:bg-transparent hover:text-foreground data-[state=on]:border-input data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-none focus-visible:z-10"
              >
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <p className="mt-2 text-sm text-muted-foreground">
            {SCOPE_HELPER_TEXT[activeScope]}
          </p>
        </div>
      ) : null}
      <RecordInput
        value={record}
        onChange={handleRecordChange}
        error={error}
        onSubmit={() => {
          if (!record || error) return;
          const digit = toDigitString(record);
          posthog.capture("record_lookup_submitted", {
            event_id: event.id,
            course_id: courseId,
            year,
            record_scope: activeScope,
            is_past_year: Number(year) !== new Date().getFullYear(),
          });
          router.push(
            `/find-by-record/${event.id}/${courseId}/${year}/${digit}?scope=${activeScope}`,
          );
        }}
        label={activeScope === "kom" ? "KOM 기록 입력" : "완주 기록 입력"}
      />
    </div>
  );
};

export default FindMyRecordSection;
