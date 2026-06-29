"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

type Props = {
  eventId: string;
  courseId: string;
  year: string;
  time: string;
  recordScope: "full" | "kom";
};

const TrackResultViewed = ({
  eventId,
  courseId,
  year,
  time,
  recordScope,
}: Props) => {
  useEffect(() => {
    posthog.capture("record_result_viewed", {
      event_id: eventId,
      course_id: courseId,
      year,
      time,
      record_scope: recordScope,
      is_past_year: Number(year) !== new Date().getFullYear(),
    });
  }, [eventId, courseId, year, time, recordScope]);

  return null;
};

export default TrackResultViewed;
