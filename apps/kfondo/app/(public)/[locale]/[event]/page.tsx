import { pageAlternates } from "@/i18n/urls";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { ParticipantTrendSection } from "./components/ParticipantTrendSection";
import { StatsSection } from "./components/StatsSection";
import { TitleSection } from "./components/TitleSection";
import { UpcomingSection } from "./components/UpcomingSection";
import { CommentsSection } from "./components/CommentsSection";
import { getEventById } from "@/lib/db/events";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventHeader } from "@/components/EventHeader";

/** 30일 (Next.js segment config는 리터럴만 허용) */
export const revalidate = 2592000;

type Props = {
  params: Promise<{ locale: Locale; event: string }>;
};

export async function generateStaticParams() {
  return [];
}

export default async function EventPage({ params }: Props) {
  const { locale, event: eventSlug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const event = await getEventById(eventSlug, locale);

  if (!event) {
    notFound();
  }

  const eventTitle = event.name || t("event.defaultName", { v0: event.location });

  return (
    <>
      <EventHeader eventTitle={eventTitle} />
      <main className="container mx-auto px-4 py-12">
        <div className="space-y-8 max-w-full">
          <div className="space-y-4">
            <TitleSection event={event} />
            <UpcomingSection event={event} />
          </div>
          <div className="space-y-16 md:space-y-20">
            <ParticipantTrendSection event={event} />
            <CommentsSection eventId={eventSlug} />
            <StatsSection event={event} />
          </div>
        </div>
      </main>
    </>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, event: eventSlug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const event = await getEventById(eventSlug, locale);

  if (!event) {
    return {
      title: t("errors.notFoundTitle"),
      description: t("errors.notFoundDescription"),
    };
  }

  const name = event.name || t("event.defaultName", { v0: event.location });
  const title =
    locale === "en"
      ? event.meta.titleEn?.trim() || t("seo.eventTitle", { name })
      : event.meta.title;
  const description =
    locale === "en"
      ? event.meta.descriptionEn?.trim() || t("seo.eventDescription", { name })
      : event.meta.description;
  const alternates = pageAlternates(`/${eventSlug}`, locale);
  return {
    alternates,
    title,
    description,
    openGraph: {
      url: alternates.canonical,
      locale: locale === "en" ? "en_US" : "ko_KR",
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}
