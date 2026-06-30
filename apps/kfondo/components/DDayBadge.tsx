"use client";

import { getDaysUntilEvent } from "@/lib/date";

type Props = {
  date: string;
};

export function DDayBadge({ date }: Props) {
  const dDay = getDaysUntilEvent(date);
  const label = dDay > 0 ? `D-${dDay}` : "D-Day";

  return (
    <div className="absolute -top-2.5 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-medium">
      {label}
    </div>
  );
}
