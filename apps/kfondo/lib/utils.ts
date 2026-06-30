import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// HH:MM:SS 형식의 시간 문자열을 초 단위로 변환하는 함수
export function timeToSeconds(timeStr: string): number {
  if (!timeStr || timeStr === "DNF" || timeStr === "DNS") return 0;

  const parts = timeStr.split(":");
  if (parts.length !== 3) return 0;

  const hours = Number.parseInt(parts[0], 10);
  const minutes = Number.parseInt(parts[1], 10);
  const seconds = Number.parseInt(parts[2], 10);

  return hours * 3600 + minutes * 60 + seconds;
}
