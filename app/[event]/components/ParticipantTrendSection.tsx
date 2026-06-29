import type { Event } from "@/lib/types";
import { getEventParticipantTrend } from "@/lib/participants";
import { ParticipantTrend } from "./ParticipantTrend";

type Props = {
  event: Event;
};

export const ParticipantTrendSection = async ({ event }: Props) => {
  const eventData = await getEventParticipantTrend(event);

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">연도별 참가자 추세</h2>
      <div className="w-full">
        <ParticipantTrend eventData={eventData} />
      </div>
      {event.comment && (
        <div className="mb-4 px-4 py-3 rounded-md bg-blue-50 border border-blue-200 text-blue-900 flex items-start">
          <svg
            className="w-5 h-5 mt-0.5 text-blue-400 shrink-0 mr-2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z"
            />
          </svg>
          <span className="text-sm font-medium">{event.comment}</span>
        </div>
      )}
    </section>
  );
};
