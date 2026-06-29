import { Calendar, Mountain, Users } from "lucide-react";
import dayjs from "dayjs";
import { normalizeEventDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { DDayBadge } from "@/components/DDayBadge";

export type EventData = {
  id: string;
  name: string;
  status: 'upcoming' | 'recently_updated' | 'archive';
  date: string;
  years: string[];
  categories: Array<{
    name: string;
    distance: number;
    elevation?: number;
  }>;
  updatedAt: string;
  participants?: number;
  dDay?: number;
  color?: {
    from: string;
    to: string;
  };
};

type EventCardProps = {
  event: EventData;
  onClick?: () => void;
};

export function EventCard({ event, onClick }: EventCardProps) {
  const isUpcoming = event.status === 'upcoming';
  const isRecentlyUpdated = event.status === 'recently_updated';
  
  const updatedDay = dayjs(normalizeEventDate(event.updatedAt));
  const daysSinceUpdate = updatedDay.isValid()
    ? dayjs().startOf("day").diff(updatedDay.startOf("day"), "day")
    : 0;
  
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative rounded-xl p-5 transition-all duration-200 overflow-hidden",
        "hover:shadow-lg cursor-pointer",
        isUpcoming && "bg-card border-2 border-emerald-500",
        isRecentlyUpdated && "bg-emerald-50 dark:bg-emerald-950 border-2 border-emerald-400",
        !isUpcoming && !isRecentlyUpdated && "bg-card border border-border hover:border-muted-foreground/50"
      )}
    >
      {/* Badge */}
      {isUpcoming && <DDayBadge date={event.date} />}
      
      {isRecentlyUpdated && daysSinceUpdate <= 7 && (
        <div className="absolute -top-2.5 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-medium">
          NEW
        </div>
      )}
      
       {/* Background gradient for archive/default state top bar or similar - optional based on design, 
          but original code had cool gradients. The new design seems cleaner white cards. 
          Will stick to white cards as per screenshot/code unless requested otherwise.
       */}

      {/* Event Name */}
      <h3 className="text-xl font-bold text-card-foreground mb-3 pr-12">
        {event.name}
      </h3>
      
      {/* Date */}
      <div className="flex items-center gap-2 text-muted-foreground mb-3">
        <Calendar className="h-4 w-4" />
        <span className="text-sm">
          {isUpcoming ? `${event.date} 예정` : event.date}
        </span>
      </div>
      
      {/* Years Data Available */}
      <div className="text-xs text-muted-foreground mb-4">
        {formatEventYears(event.years)}
      </div>
      
      {/* Categories */}
      <div className="space-y-2">
        {event.categories.map((cat, idx) => (
          <div
            key={idx}
            className={cn(
              "flex items-center justify-between p-2 rounded-lg",
              isUpcoming
                ? "bg-emerald-50 dark:bg-slate-700"
                : isRecentlyUpdated
                  ? "bg-white border border-emerald-100 dark:border-emerald-800 dark:bg-slate-700"
                  : "bg-white border border-border dark:border-slate-600 dark:bg-slate-700"
            )}
          >
            <span className="text-sm font-medium text-gray-900 dark:text-gray-200">
              {cat.name}
            </span>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-300">
              <span>{cat.distance}km</span>
              {cat.elevation ? (
                <div className="flex items-center gap-1">
                  <Mountain className="h-3 w-3" />
                  <span>{cat.elevation}m</span>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      
      {/* Participants (if available) */}
      {event.participants ? (
        <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{event.participants.toLocaleString()}명 참가</span>
        </div>
      ) : null}
      
      {/* Update Info for Recently Updated */}
      {isRecentlyUpdated && (
        <div className="mt-3 text-xs text-emerald-600 dark:text-emerald-400">
          {daysSinceUpdate === 0 ? '오늘' : `${daysSinceUpdate}일 전`} 업데이트
        </div>
      )}
    </div>
  );
}

export function formatEventYears(years: string[]): string {
  if (!years || years.length === 0) {
    return "기록: 이전 기록 없음";
  }

  if (years.length === 1) {
    return `기록: ${years[0]}`;
  }

  const sorted = [...years].sort();
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  
  return `기록: ${min}~${max}`;
}
