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
  params: Promise<{
    event: string;
  }>;
};

export async function generateStaticParams() {
  return [];
}

export default async function EventPage({ params }: Props) {
  const { event: eventSlug } = await params;
  const event = await getEventById(eventSlug);

  if (!event) {
    notFound();
  }

  const eventTitle = event.name || `${event.location} 그란폰도`;

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
  const { event: eventSlug } = await params;
  const event = await getEventById(eventSlug);

  if (!event) {
    return {
      title: "페이지를 찾을 수 없습니다 | K-Fondo",
      description: "요청하신 페이지를 찾을 수 없습니다.",
    };
  }

  return {
    title: event.meta.title,
    description: event.meta.description,
    openGraph: {
      title: event.meta.title,
      description: event.meta.description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: event.meta.title,
      description: event.meta.description,
    },
  };
}
