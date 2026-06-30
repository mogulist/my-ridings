"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { RaceCategory } from "@/lib/types";

type CourseViewSelectProps = {
  course: RaceCategory;
  eventSlug: string;
  year: number;
};

type CourseLinkOption = {
  value: string;
  label: string;
  href: string;
};

function buildCourseViewOptions(
  course: RaceCategory,
  eventSlug: string,
  year: number,
): CourseLinkOption[] {
  const opts: CourseLinkOption[] = [];
  const official = course.officialSiteUrl?.trim();
  if (official) opts.push({ value: "official", label: "공식 사이트", href: official });
  const strava = course.stravaUrl?.trim();
  if (strava) opts.push({ value: "strava", label: "Strava", href: strava });
  const rwgps = course.rideWithGpsUrl?.trim();
  if (rwgps) opts.push({ value: "rwgps", label: "RideWithGPS", href: rwgps });
  const hasGpx =
    typeof course.gpxBlobUrl === "string" && course.gpxBlobUrl.trim().length > 0;
  if (hasGpx)
    opts.push({
      value: "naver",
      label: "네이버맵",
      href: `/${eventSlug}/map/${course.id}?year=${year}`,
    });
  return opts;
}

export function CourseViewSelect({ course, eventSlug, year }: CourseViewSelectProps) {
  const hasGpx =
    typeof course.gpxBlobUrl === "string" && course.gpxBlobUrl.trim().length > 0;
  if (!hasGpx) return null;

  const options = buildCourseViewOptions(course, eventSlug, year);
  if (options.length === 0) return null;

  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0 gap-1 px-3 text-xs font-normal sm:text-sm"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label="코스 보기"
        >
          코스 보기
          <ChevronDown className="size-3.5 shrink-0 opacity-60" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={4}
        className={cn("w-auto min-w-[10rem] p-1 sm:min-w-[11rem]")}
      >
        <ul className="flex flex-col gap-0.5" role="menu">
          {options.map((o) => (
            <li key={o.value} role="none">
              <button
                type="button"
                role="menuitem"
                className="w-full rounded-sm px-3 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
                onClick={() => {
                  window.open(o.href, "_blank", "noopener,noreferrer");
                  setOpen(false);
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
