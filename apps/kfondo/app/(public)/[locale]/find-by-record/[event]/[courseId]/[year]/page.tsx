import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEventById } from "@/lib/db/events";
import { EventHeader } from "@/components/EventHeader";
import { FindByRecordNav } from "@/components/FindByRecordNav";
import FindMyRecordSection from "./FindMyRecordSection";
import { generateFindRecordMetadata } from "@/lib/metadata";

type Props = {
  params: Promise<{ locale: Locale; event: string; courseId: string; year: string }>;
  searchParams: Promise<{ scope?: string }>;
};

const parseScope = (scope?: string): "full" | "kom" => (scope === "kom" ? "kom" : "full");

const FindMyRecordPage = async ({ params, searchParams }: Props) => {
  const { locale, event: eventId, courseId, year } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const { scope } = await searchParams;
  const event = await getEventById(eventId, locale);

  if (!event) {
    notFound();
  }
  const eventName = event.name || t("event.defaultName", { v0: event.location });

  return (
    <>
      <EventHeader eventTitle={eventName} />
      <FindByRecordNav
        backHref={`/${eventId}`}
        backLabel={eventName}
        breadcrumbs={[{ label: eventName, href: `/${eventId}` }, { label: t("record.lookup") }]}
      />
      <main className="container mx-auto px-0 py-0">
        <FindMyRecordSection
          event={event}
          eventName={eventName}
          courseId={courseId}
          year={year}
          initialScope={parseScope(scope)}
        />
      </main>
    </>
  );
};

const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { locale, event: eventId, courseId, year } = await params;
  setRequestLocale(locale);
  return generateFindRecordMetadata({ eventId, courseId, year, locale });
};

export default FindMyRecordPage;
export { generateMetadata };
