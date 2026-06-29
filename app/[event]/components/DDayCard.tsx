"use client";

import { getDaysUntilEvent } from "@/lib/date";
import { Calendar } from "lucide-react";

type Props = {
  date: string;
  dateLabel: string;
};

export function DDayCard({ date, dateLabel }: Props) {
  const dDay = getDaysUntilEvent(date);

  return (
    <div
      className="rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-4 text-white"
      style={{
        background:
          "linear-gradient(to right, rgb(16, 185, 129), rgb(4, 120, 87))",
      }}
      role="region"
      aria-label="다가오는 대회 일정"
    >
      <div>
        <p className="text-sm text-white/80">올해 개최까지</p>
        <p className="text-3xl font-bold tabular-nums">
          {dDay > 0 ? `D-${dDay}` : "D-Day"}
        </p>
      </div>
      <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5">
        <Calendar className="size-4 shrink-0" aria-hidden />
        <span className="text-sm font-medium">{dateLabel}</span>
      </div>
    </div>
  );
}
