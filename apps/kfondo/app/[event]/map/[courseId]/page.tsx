import { getEventById } from "@/lib/db/events";
import { notFound } from "next/navigation";
import { CourseMapPageClient } from "./CourseMapPageClient";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ event: string; courseId: string }>;
  searchParams: Promise<{ year?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { event: eventSlug, courseId } = await params;
  const { year: yearStr } = await searchParams;
  const event = await getEventById(eventSlug);
  if (!event) return { title: "코스 지도" };
  const year = yearStr ? Number(yearStr) : Math.max(...event.years, 0);
  const detail = event.yearDetails[year];
  const course = detail?.courses?.find((c) => c.id === courseId);
  const title = course?.name
    ? `${course.name} - ${event.name ?? eventSlug} 코스 지도`
    : "코스 지도";
  return { title };
}

export default async function CourseMapPage({ params, searchParams }: Props) {
  const { event: eventSlug, courseId } = await params;
  const { year: yearStr } = await searchParams;

  const event = await getEventById(eventSlug);
  if (!event) notFound();

  const year = yearStr ? Number(yearStr) : (event.years.length ? Math.max(...event.years) : 0);
  const detail = event.yearDetails[year];
  const course = detail?.courses?.find((c) => c.id === courseId);

  if (!course?.gpxBlobUrl) notFound();

  const eventName = event.name ?? eventSlug;
  const courseName = course.name;
  const distanceLabel =
    typeof course.distance === "number" && course.distance > 0
      ? ` (${course.distance}km)`
      : "";

  return (
    <CourseMapPageClient
      eventSlug={eventSlug}
      eventName={eventName}
      courseName={courseName}
      distanceLabel={distanceLabel}
      gpxBlobUrl={course.gpxBlobUrl}
    />
  );
}
