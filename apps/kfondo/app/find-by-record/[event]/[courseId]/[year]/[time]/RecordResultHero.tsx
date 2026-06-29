"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import BrandMark from "./BrandMark";

type Gender = "male" | "female";

type RecordResultHeroProps = {
  year: string;
  eventName: string;
  eventDate: string;
  parsedTime: string;
  scopeRecordLabel: string;
  scopeRankLabel: string;
  scopeLabel: string;
  isKomScope: boolean;
  scopePeoplePrefix: string;
  courseInfo: { name: string; distance: number; elevation: number } | undefined;
  rank: number | null;
  percentile: number | null;
  percentileByParticipants: number | null;
  totalParticipants: number;
  finishers: number;
  rankMale: number | null;
  rankFemale: number | null;
  finishersMale: number;
  finishersFemale: number;
};

const fmtPct = (v: number | null) => (v != null ? `${v.toFixed(1)}%` : "-");

const RecordResultHero = ({
  year,
  eventName,
  eventDate,
  parsedTime,
  scopeRecordLabel,
  scopeRankLabel,
  scopeLabel,
  isKomScope,
  scopePeoplePrefix,
  courseInfo,
  rank,
  percentile,
  percentileByParticipants,
  totalParticipants,
  finishers,
  rankMale,
  rankFemale,
  finishersMale,
  finishersFemale,
}: RecordResultHeroProps) => {
  const [gender, setGender] = React.useState<Gender | null>(null);

  const hasStats = rank != null;
  const hasGender = rankMale != null || rankFemale != null;

  const genderRank = gender === "male" ? rankMale : rankFemale;
  const genderFinishers =
    gender === "male" ? finishersMale : finishersFemale;
  const genderText = gender === "male" ? "남자" : "여자";

  const toggleItemClass =
    "h-7 min-h-7 rounded-sm border border-transparent bg-transparent px-2.5 py-0 text-sm font-medium leading-none shadow-none ring-offset-0 hover:bg-transparent hover:text-foreground data-[state=on]:border-input data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-none focus-visible:z-10";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-white to-emerald-50/60 px-5 py-6 shadow-sm dark:border-emerald-900/50 dark:from-slate-900 dark:to-emerald-950/30 sm:px-8 sm:py-8">
      {/* 인증 이미지와 동일한 장식 원 (은은하게) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-emerald-400/10"
      />

      <div className="relative z-10 flex flex-col">
        {/* 날짜 (제목 위 메타 줄) */}
        {eventDate ? (
          <span className="text-xs font-medium text-muted-foreground">
            {eventDate}
          </span>
        ) : null}

        {/* 제목 + 뱃지 */}
        <h1 className="mt-1 text-xl font-extrabold leading-tight text-foreground sm:text-2xl">
          {year}년 {eventName}
        </h1>
        {courseInfo ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge className="bg-blue-600 text-white">{courseInfo.name}</Badge>
            <Badge
              className={
                isKomScope
                  ? "border border-violet-500 bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200"
                  : "bg-emerald-600 text-white"
              }
            >
              {scopeLabel}
            </Badge>
            <Badge className="bg-green-600 text-white">
              {courseInfo.distance}km
            </Badge>
            <Badge className="bg-orange-500 text-white">
              {courseInfo.elevation}m
            </Badge>
          </div>
        ) : null}

        {/* 히어로 기록 */}
        <div className="mt-6 flex flex-col items-center">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">
            {scopeRecordLabel}
          </span>
          <span className="text-5xl font-black tracking-tight text-emerald-600 tabular-nums dark:text-emerald-400 sm:text-6xl">
            {parsedTime}
          </span>
        </div>

        {/* 통계 3종 (한 줄) */}
        {hasStats ? (
          <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
            <Stat
              value={`${rank}위`}
              valueClassName="text-foreground"
              label={scopeRankLabel}
            />
            <Stat
              value={fmtPct(percentileByParticipants)}
              valueClassName="text-foreground"
              label="참가자 기준"
              sub={`${scopePeoplePrefix}${totalParticipants.toLocaleString()}명`}
            />
            <Stat
              value={fmtPct(percentile)}
              valueClassName="text-emerald-600 dark:text-emerald-400"
              label="완주자 기준"
              sub={`${scopePeoplePrefix}${finishers.toLocaleString()}명`}
            />
          </div>
        ) : null}

        {/* 성별 순위 토글 (선택 시 인라인 표시) */}
        {hasStats && hasGender ? (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">성별 순위</span>
              <ToggleGroup
                type="single"
                value={gender ?? ""}
                onValueChange={(value) =>
                  setGender(value ? (value as Gender) : null)
                }
                size="sm"
                className="w-fit justify-start gap-0 rounded-md bg-muted/60 p-0.5 text-muted-foreground"
                aria-label="성별 순위 보기"
              >
                {rankMale != null ? (
                  <ToggleGroupItem value="male" className={toggleItemClass}>
                    남
                  </ToggleGroupItem>
                ) : null}
                {rankFemale != null ? (
                  <ToggleGroupItem value="female" className={toggleItemClass}>
                    여
                  </ToggleGroupItem>
                ) : null}
              </ToggleGroup>
            </div>
            {gender && genderRank != null ? (
              <span className="text-sm font-semibold text-foreground">
                {genderText} {genderRank}위
                <span className="ml-1 font-normal text-muted-foreground">
                  · {scopePeoplePrefix}
                  {genderFinishers.toLocaleString()}명 기준
                </span>
              </span>
            ) : null}
          </div>
        ) : null}

        {/* 하단 브랜드 워터마크 */}
        <div className="mt-6 flex justify-center opacity-70">
          <BrandMark size="sm" />
        </div>
      </div>
    </div>
  );
};

type StatProps = {
  value: string;
  label: string;
  sub?: string;
  valueClassName?: string;
};

const Stat = ({ value, label, sub, valueClassName = "" }: StatProps) => (
  <div className="flex flex-col items-center rounded-xl border border-border/60 bg-card/60 px-1.5 py-3 text-center">
    <div
      className={`text-2xl font-extrabold tabular-nums sm:text-3xl ${valueClassName}`}
    >
      {value}
    </div>
    <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    {sub ? (
      <div className="mt-0.5 text-[10px] leading-tight text-muted-foreground/80">
        {sub}
      </div>
    ) : null}
  </div>
);

export default RecordResultHero;
