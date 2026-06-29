export type CrawlerRecord = {
  BIB_NO: number;
  Gender: string;
  Event: string;
  Time: string;
  Status: string;
  StartTime?: string;
  FinishTime?: string;
  [key: string]: any; // 동적 체크포인트 필드
};

export type CrawlerType = "sptc" | "smartchip";

export type CrawlerConfig = {
  eventName: string;
  eventId: string;
  startBib: number;
  endBib: number;
  period: number;
  outputFile: string;
};

export type CrawlerFunction = (
  config: CrawlerConfig
) => Promise<CrawlerRecord[]>;
