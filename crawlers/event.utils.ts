import { EventInfo, EVENTS } from "./event.config";

export function getEventInfo(location: string, year: string): EventInfo | null {
  return EVENTS[location]?.[year] || null;
}

export function generateUrl(eventInfo: EventInfo, bibNo: number): string {
  const bibStr = bibNo.toString().padStart(6, "0");
  // 2025년은 https를 사용
  const protocol = eventInfo.year === "2025" ? "https" : "http";

  // 모든 이벤트에 대해 새로운 URL 형식 사용 (E와 B 파라미터)
  return `${protocol}://time.spct.kr/m2.php?E=${eventInfo.eventNo}&B=${bibStr}`;
}
