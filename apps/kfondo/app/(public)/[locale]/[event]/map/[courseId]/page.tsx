import { pageAlternates } from "@/i18n/urls";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getEventById } from "@/lib/db/events";
import { notFound } from "next/navigation";
import { CourseMapPageClient } from "./CourseMapPageClient";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ locale: Locale; event: string; courseId: string }>;
  searchParams: Promise<{ year?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, event: eventSlug, courseId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const { year: yearStr } = await searchParams;
  const event = await getEventById(eventSlug, locale);
  if (!event) return { title: t("map.title") };
  const year = yearStr ? Number(yearStr) : Math.max(...event.years, 0);
  const detail = event.yearDetails[year];
  const course = detail?.courses?.find((c) => c.id === courseId);
  const title = course?.name
    ? t("map.pageTitle", { v0: course.name, v1: event.name ?? eventSlug })
    : t("map.title");
  return {
    title,
    alternates: pageAlternates(
      `/${eventSlug}/map/${courseId}${yearStr ? `?year=${yearStr}` : ""}`,
      locale,
    ),
    openGraph: { title, locale: locale === "en" ? "en_US" : "ko_KR" },
  };
}

export default async function CourseMapPage({ params, searchParams }: Props) {
  const { locale, event: eventSlug, courseId } = await params;
  setRequestLocale(locale);
  const { year: yearStr } = await searchParams;

  const event = await getEventById(eventSlug, locale);
  if (!event) notFound();

  const year = yearStr ? Number(yearStr) : event.years.length ? Math.max(...event.years) : 0;
  const detail = event.yearDetails[year];
  const course = detail?.courses?.find((c) => c.id === courseId);

  if (!course?.gpxBlobUrl) notFound();

  const eventName = event.name ?? eventSlug;
  const courseName = course.name;
  const distanceLabel =
    typeof course.distance === "number" && course.distance > 0 ? ` (${course.distance}km)` : "";

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
