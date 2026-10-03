import { localePath, pageAlternates, SITE_URL } from "@/i18n/urls";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { EventHeader } from "@/components/EventHeader";
import { FindByRecordNav } from "@/components/FindByRecordNav";
import { generateFindRecordMetadata } from "@/lib/metadata";
import {
  getFindByRecordData,
  type FindByRecordScope,
  msecToTimeString,
  msecDiffToLabel,
} from "@/lib/find-by-record-data";
import RecordResultHero from "./RecordResultHero";
import ShareRecordMenu from "./ShareRecordMenu";
import TrackResultViewed from "./TrackResultViewed";

type Props = {
  params: Promise<{ locale: Locale; event: string; courseId: string; year: string; time: string }>;
  searchParams: Promise<{ scope?: string }>;
};

const parseScope = (scope?: string): FindByRecordScope => (scope === "kom" ? "kom" : "full");

const ResultPage = async (props: Props) => {
  const awaitedParams = await props.params;
  const awaitedSearchParams = await props.searchParams;
  const { locale, event: eventId, courseId, year, time } = awaitedParams;
  setRequestLocale(locale);
  const t = await getTranslations();
  const requestedScope = parseScope(awaitedSearchParams.scope);

  const data = await getFindByRecordData(eventId, courseId, year, time, requestedScope, locale);
  if (!data) notFound();

  const {
    event,
    recordScope,
    parsedTime,
    rank,
    percentile,
    percentileByParticipants,
    rankMale,
    rankFemale,
    finishersMale,
    finishersFemale,
    totalParticipants,
    finishers,
    courseInfo,
    recordsAround,
    eventDate,
  } = data;

  const eventName = event.name || t("event.defaultName", { v0: event.location });
  const isKomScope = recordScope === "kom";
  const scopeLabel = isKomScope ? "KOM" : t("record.full");
  const scopeRecordLabel = isKomScope ? t("record.komRecord") : t("record.fullRecord");
  const scopeRankLabel = isKomScope ? t("record.komRank") : t("record.fullRank");
  const scopePeoplePrefix = isKomScope ? "KOM " : "";
  const backToInputHref = `/find-by-record/${eventId}/${courseId}/${year}?scope=${recordScope}`;
  const toFullResultHref = `/find-by-record/${eventId}/${courseId}/${year}/${time}`;
  const inputMsec = recordsAround.find((rec) => rec.isInput)?.msec ?? null;

  const resultMsg =
    rank === null ? (
      <div className="mb-4 flex flex-col items-center gap-2">
        <div className="text-lg text-red-500">
          {isKomScope ? t("record.noKom") : t("record.noFinishers")}
        </div>
        {isKomScope ? (
          <Link className="text-sm text-primary underline" href={toFullResultHref}>
            {t("record.viewFull")}
          </Link>
        ) : null}
      </div>
    ) : null;

  return (
    <>
      <TrackResultViewed
        eventId={eventId}
        courseId={courseId}
        year={year}
        time={time}
        recordScope={recordScope}
      />
      <EventHeader eventTitle={eventName} />
      <FindByRecordNav
        backHref={backToInputHref}
        backLabel={t("record.lookup")}
        breadcrumbs={[
          { label: eventName, href: `/${eventId}` },
          { label: t("record.lookup"), href: backToInputHref },
          { label: t("record.result") },
        ]}
        trailing={
          <ShareRecordMenu
            eventId={eventId}
            courseId={courseId}
            year={year}
            time={time}
            recordScope={recordScope}
            title={t("share.title", { v0: year, v1: eventName })}
            description={t("share.description", {
              v0: scopeRecordLabel,
              v1: parsedTime,
              v2: rank ?? "-",
            })}
          />
        }
      />
      <main className="container mx-auto px-0 py-0">
        <div className="max-w-full px-4 py-4">
          <div className="mx-auto w-full max-w-2xl">
            <RecordResultHero
              year={year}
              eventName={eventName}
              eventDate={eventDate}
              parsedTime={parsedTime}
              scopeRecordLabel={scopeRecordLabel}
              scopeRankLabel={scopeRankLabel}
              scopeLabel={scopeLabel}
              isKomScope={isKomScope}
              scopePeoplePrefix={scopePeoplePrefix}
              courseInfo={courseInfo}
              rank={rank}
              percentile={percentile}
              percentileByParticipants={percentileByParticipants}
              totalParticipants={totalParticipants}
              finishers={finishers}
              rankMale={rankMale}
              rankFemale={rankFemale}
              finishersMale={finishersMale}
              finishersFemale={finishersFemale}
            />
          </div>

          <div className="mx-auto w-full max-w-2xl">
            {resultMsg ? (
              <div className="mt-6">{resultMsg}</div>
            ) : (
              <>
                <div className="my-8 flex items-center justify-center gap-3">
                  <span className="h-px flex-1 bg-linear-to-l from-emerald-300/60 to-transparent dark:from-emerald-700/50" />
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    {t("record.nearby", { v0: scopeRecordLabel })}
                  </span>
                  <span className="h-px flex-1 bg-linear-to-r from-emerald-300/60 to-transparent dark:from-emerald-700/50" />
                </div>
                <div className="mx-auto w-fit">
                  <ul className="relative flex flex-col">
                    <span
                      aria-hidden
                      className="absolute bottom-2 left-2.5 top-2 w-px -translate-x-1/2 bg-linear-to-b from-emerald-200 via-emerald-300/70 to-emerald-200 dark:from-emerald-900 dark:via-emerald-700/60 dark:to-emerald-900"
                    />
                    {recordsAround.map((rec, idx) => {
                      const diffLabel = rec.isInput
                        ? t("record.myTime")
                        : inputMsec != null
                          ? msecDiffToLabel(rec.msec - inputMsec)
                          : null;

                      return (
                        <li key={idx} className="flex items-center py-1.5">
                          <span className="relative z-10 flex w-5 shrink-0 justify-center">
                            <span
                              aria-hidden
                              className={
                                rec.isInput
                                  ? "h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20"
                                  : "h-1.5 w-1.5 rounded-full bg-emerald-200 dark:bg-emerald-800"
                              }
                            />
                          </span>
                          <div className="flex items-baseline gap-2">
                            <span
                              className={
                                rec.isInput
                                  ? "rounded-full border border-emerald-500/60 bg-white px-4 py-1 text-base font-extrabold tabular-nums text-emerald-600 shadow-sm dark:bg-slate-900 dark:text-emerald-400"
                                  : "px-1 py-0.5 text-sm tabular-nums text-muted-foreground"
                              }
                            >
                              {msecToTimeString(rec.msec)}
                            </span>
                            {diffLabel ? (
                              <span
                                className={
                                  rec.isInput
                                    ? "text-[11px] font-semibold text-emerald-600 dark:text-emerald-400"
                                    : "text-[11px] font-medium tabular-nums text-muted-foreground"
                                }
                              >
                                {diffLabel}
                              </span>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

const generateMetadata = async ({ params, searchParams }: Props): Promise<Metadata> => {
  const { locale, event: eventId, courseId, year, time } = await params;
  setRequestLocale(locale);
  const { scope } = await searchParams;
  const recordScope = parseScope(scope);
  const base = await generateFindRecordMetadata({
    eventId,
    courseId,
    year,
    locale,
  });

  // 페이지별 URL 설정 (Facebook이 og:url을 기준으로 OG 이미지를 가져옴)
  const pageUrl = new URL(
    `${SITE_URL}${localePath(`/find-by-record/${eventId}/${courseId}/${year}/${time}`, locale)}`,
  );
  if (recordScope === "kom") {
    pageUrl.searchParams.set("scope", "kom");
  }

  return {
    ...base,
    alternates: {
      ...pageAlternates(pageUrl.pathname + pageUrl.search, locale),
    },
    openGraph: {
      ...base.openGraph,
      url: pageUrl.toString(),
    },
    twitter: {
      ...base.twitter,
      card: "summary_large_image" as const,
    },
  };
};

export default ResultPage;
export { generateMetadata };
