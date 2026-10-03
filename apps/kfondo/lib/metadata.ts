import type { Metadata } from "next";
import { getEventById } from "@/lib/db/events";
import { translator } from "@/i18n/translator";
import { eventDisplayName } from "@/i18n/content";
import type { Locale } from "@/i18n/routing";
import { pageAlternates } from "@/i18n/urls";
export async function generateFindRecordMetadata({
  eventId,
  courseId,
  year,
  locale = "ko",
}: {
  eventId: string;
  courseId: string;
  year: string;
  locale?: Locale;
}): Promise<Metadata> {
  const event = await getEventById(eventId, locale);
  const t = translator(locale);
  if (!event)
    return { title: t("errors.notFoundTitle"), description: t("errors.notFoundDescription") };
  const course = event.yearDetails[Number(year)]?.courses.find((c) => c.id === courseId);
  const values = { year, name: eventDisplayName(event, locale), course: course?.name ?? courseId };
  const title = t("seo.recordTitle", values),
    description = t("seo.recordDescription", values);
  const alternates = pageAlternates(`/find-by-record/${eventId}/${courseId}/${year}`, locale);
  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      url: alternates.canonical,
      locale: locale === "en" ? "en_US" : "ko_KR",
      type: "website",
    },
    twitter: { card: "summary", title, description },
  };
}
