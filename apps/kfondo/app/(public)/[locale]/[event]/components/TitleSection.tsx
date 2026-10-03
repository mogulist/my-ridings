import { useTranslations, useLocale } from "next-intl";
import type { Event } from "@/lib/types";

type Props = {
  event: Event;
};

export const TitleSection = ({ event }: Props) => {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <div>
      <h1 id="page-title" className="text-4xl font-bold tracking-tight">
        {event.name || t("event.defaultName", { v0: event.location })}
      </h1>
      {locale === "en" && event.originalName && event.originalName !== event.name && (
        <p lang="ko" className="mt-2 text-lg text-muted-foreground">
          {event.originalName}
        </p>
      )}
    </div>
  );
};
