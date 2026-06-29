"use client";

import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
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

export function HomePagePresentation({
  initialData,
  searchQuery,
}: HomePagePresentationProps) {
  const { recentEvents, upcomingCarousels, otherEvents, showSections } =
    useMemo(
      () => filterHomePageDataBySearch(initialData, searchQuery),
      [initialData, searchQuery]
    );

  const hasSearchResults =
    recentEvents.length > 0 ||
    upcomingCarousels.length > 0 ||
    otherEvents.length > 0;

  return (
    <>
      <Header />
      <HeroSection initialQuery={searchQuery} />
      <main className="py-12">
        <div className="space-y-12">
          {recentEvents.length > 0 && (
            <EventCarousel
              icon="⚡️"
              title="최근 기록 업데이트"
              events={recentEvents}
            />
          )}

          {upcomingCarousels.map((carousel) => (
            <EventCarousel
              key={carousel.title}
              icon="📅"
              title={carousel.title}
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
                  <h2
                    id="all-events-heading"
                    className="text-2xl font-bold text-foreground"
                  >
                    전체 대회 ({otherEvents.length})
                  </h2>
                </div>
              )}
              <nav aria-label="전체 대회 목록">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {otherEvents.map((event) => (
                    <Link
                      href={`/${event.id}`}
                      key={event.id}
                      className="block"
                    >
                      <EventCard event={mapToEventData(event)} />
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
                &quot;{searchQuery}&quot;에 대한 검색 결과가 없습니다.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                다른 검색어로 시도해보세요.
              </p>
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
      window.history.replaceState(null, "", `/#q=${encodeURIComponent(query)}`);
    }
    setSearchQuery(query);

    const handleHashChange = () => setSearchQuery(getSearchQueryFromUrl());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <HomePagePresentation
      initialData={initialData}
      searchQuery={searchQuery}
    />
  );
}
