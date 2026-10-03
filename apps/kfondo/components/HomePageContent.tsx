"use client";

import { useTranslations, useLocale } from "next-intl";

import { useMemo, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { EventCard } from "@/components/EventCard";
import Header from "@/components/Header";
import { EventCarousel } from "@/components/EventCarousel";
import { HeroSection } from "@/components/HeroSection";
import {
  filterHomePageDataBySearch,
  mapToEventData,
  type HomePageFilteredData,
} from "@/app/eventFilter";

type HomePageContentProps = {
  initialData: HomePageFilteredData;
};

type HomePagePresentationProps = {
  initialData: HomePageFilteredData;
  searchQuery: string;
};

export function HomePagePresentation({ initialData, searchQuery }: HomePagePresentationProps) {
  const t = useTranslations();
  const locale = useLocale();

  const { recentEvents, upcomingCarousels, otherEvents, showSections } = useMemo(
    () => filterHomePageDataBySearch(initialData, searchQuery),
    [initialData, searchQuery],
  );

  const hasSearchResults =
    recentEvents.length > 0 || upcomingCarousels.length > 0 || otherEvents.length > 0;

  return (
    <>
      <Header />
      <HeroSection initialQuery={searchQuery} />
      <main className="py-12">
        <div className="space-y-12">
          {recentEvents.length > 0 && (
            <EventCarousel icon="⚡️" title={t("home.recent")} events={recentEvents} />
          )}

          {upcomingCarousels.map((carousel) => (
            <EventCarousel
              key={carousel.title}
              icon="📅"
              title={
                carousel.month === undefined
                  ? t("home.upcoming")
                  : carousel.minDay === undefined
                    ? t("home.upcomingMonth", {
                        month: new Intl.DateTimeFormat(locale, {
                          month: "long",
                          timeZone: "Asia/Seoul",
                        }).format(new Date(Date.UTC(2026, carousel.month, 1))),
                      })
                    : t("home.upcomingRange", {
                        month: new Intl.DateTimeFormat(locale, {
                          month: "long",
                          timeZone: "Asia/Seoul",
                        }).format(new Date(Date.UTC(2026, carousel.month, 1))),
                        min: carousel.minDay,
                        max: carousel.maxDay ?? carousel.minDay,
                      })
              }
              events={carousel.events}
            />
          ))}

          {otherEvents.length > 0 && (
            <section
              className="container mx-auto px-4 space-y-6"
              aria-labelledby="all-events-heading"
            >
              {showSections && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl" aria-hidden="true">
                    📂
                  </span>
                  <h2 id="all-events-heading" className="text-2xl font-bold text-foreground">
                    {t("home.allEvents", { v0: otherEvents.length })}
                  </h2>
                </div>
              )}
              <nav aria-label={t("home.allEventsLabel")}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {otherEvents.map((event) => (
                    <Link href={`/${event.id}`} key={event.id} className="block">
                      <EventCard event={mapToEventData(event, locale as "ko" | "en")} />
                    </Link>
                  ))}
                </div>
              </nav>
            </section>
          )}

          {searchQuery.trim() && !hasSearchResults && (
            <section
              className="container mx-auto px-4 text-center py-12"
              aria-live="polite"
              role="status"
            >
              <p className="text-xl text-muted-foreground">
                {t("home.noResults", { v0: searchQuery })}
              </p>
              <p className="text-sm text-muted-foreground mt-2">{t("home.tryAnother")}</p>
            </section>
          )}
        </div>
      </main>
    </>
  );
}

function getSearchQueryFromUrl(): string {
  if (typeof window === "undefined") return "";
  const hash = window.location.hash;
  if (hash.startsWith("#q=")) {
    return decodeURIComponent(hash.slice(3));
  }
  const params = new URLSearchParams(window.location.search);
  return params.get("q") || "";
}

export function HomePageContent({ initialData }: HomePageContentProps) {
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const query = getSearchQueryFromUrl();
    if (query && window.location.search && !window.location.hash) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}#q=${encodeURIComponent(query)}`,
      );
    }
    setSearchQuery(query);

    const handleHashChange = () => setSearchQuery(getSearchQueryFromUrl());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return <HomePagePresentation initialData={initialData} searchQuery={searchQuery} />;
}
