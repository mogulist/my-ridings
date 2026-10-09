export type Event = {
  id: string;
  location: string;
  name?: string;
  nameEn?: string;
  originalName?: string;
  locationEn?: string;
  originalLocation?: string;
  searchTerms?: string[];
  years: number[];
  color: {
    from: string;
    to: string;
  };
  status: "ready" | "upcoming" | "completed";
  meta: {
    title: string;
    titleEn?: string;
    description: string;
    descriptionEn?: string;
    image: string;
  };
  comment?: string;
  commentEn?: string;
  // 연도별 상세 정보
  yearDetails: Record<number, EventYearDetail>;
  dataSource?: "Marazone" | "SPTC" | "스마트칩" | "my.raceresult.com";
};

export type GranMedio = {
  [key: string]: number;
};

export type EventYear = {
  year: number;
  registered: GranMedio;
  participants: GranMedio;
  dnf: GranMedio;
};

export type TimeDistribution = {
  timeRange: string;
  participants: number;
  percentile: number;
  cumulativeCount?: number;
  /** `generateTimeDistributionFromRecords` 구간 길이(분), 툴팁 등 */
  interval?: number;
};

export type EventYearStats = {
  year: number;
  granFondoDistribution: TimeDistribution[];
  medioFondoDistribution: TimeDistribution[];
  comment?: string;
  commentEn?: string;
};

export type EventYearStatsWithCourses = {
  year: number;
  distributions: {
    courseId: string;
    courseName: string;
    distribution: TimeDistribution[];
  }[];
  comment?: string;
  commentEn?: string;
};

export type RaceRecord = {
  bibNo: string;
  gender: string;
  event: string;
  time: string;
  status: string;
  timeInSeconds?: number;
};

// 대회 종목 타입
export type RaceCategory = {
  id: string; // 종목 고유 ID (예: "granfondo", "mediofondo", "kom")
  nameEn?: string;
  originalName?: string;
  name: string; // 종목 이름 (예: "그란폰도", "메디오폰도", "KOM")
  distance: number; // 거리
  elevation?: number; // 고도
  registered?: number; // 등록자 수
  comment?: string;
  commentEn?: string;
  officialSiteUrl?: string;
  stravaUrl?: string;
  rideWithGpsUrl?: string;
  gpxBlobUrl?: string;
  /** 에디션에 KOM Blob이 있을 때 이 코스에만 [전체/KOM] 노출 */
  hasKom?: boolean;
};

// 연도별 대회 정보
export type EventYearDetail = {
  comment?: string;
  commentEn?: string;
  year: number;
  date: string;
  status?: "completed" | "upcoming" | "ready" | "preparing" | "cancelled" | "not_collected";
  courses: RaceCategory[];
  totalRegistered: number;
  url?: string;
  recordsBlobUrl?: string; // Phase 3: Vercel Blob URL (원본 기록)
  sortedRecordsBlobUrl?: string; // Phase 3: Vercel Blob URL (정렬된 기록)
  komRecordsBlobUrl?: string; // KOM 원본 기록 Blob URL
  komSortedRecordsBlobUrl?: string; // KOM 정렬 기록 Blob URL
  noticeEn?: string;
  notice?: string; // 사용자 공개 메모 (예: 코스 변경, 악천후 안내 등)
};
