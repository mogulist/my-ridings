import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEventById } from "@/lib/db/events";
import { EventHeader } from "@/components/EventHeader";
import { FindByRecordNav } from "@/components/FindByRecordNav";
import FindMyRecordSection from "./FindMyRecordSection";
import { generateFindRecordMetadata } from "@/lib/metadata";

type Props = {
  params: {
    event: string;
    courseId: string;
    year: string;
  };
  searchParams: Promise<{ scope?: string }>;
};

const parseScope = (scope?: string): "full" | "kom" =>
  scope === "kom" ? "kom" : "full";

const FindMyRecordPage = async ({ params, searchParams }: Props) => {
  const { event: eventId, courseId, year } = await params;
  const { scope } = await searchParams;
  const event = await getEventById(eventId);

  if (!event) {
    notFound();
  }
  const eventName = event.name || `${event.location} 그란폰도`;

  return (
    <>
      <EventHeader eventTitle={eventName} />
      <FindByRecordNav
        backHref={`/${eventId}`}
        backLabel={eventName}
        breadcrumbs={[
          { label: eventName, href: `/${eventId}` },
          { label: "기록으로 찾기" },
        ]}
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
  const { event: eventId, courseId, year } = await params;
  return generateFindRecordMetadata({ eventId, courseId, year });
};

export default FindMyRecordPage;
export { generateMetadata };
