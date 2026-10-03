"use client";

import { useTranslations } from "next-intl";

export default function EventError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();

  return (
    <main className="container mx-auto flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <h1 className="text-xl font-semibold">{t("errors.loadTitle")}</h1>
      <p className="text-muted-foreground text-sm">{t("errors.loadDescription")}</p>
      <button
        onClick={() => reset()}
        className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
      >
        {t("errors.retry")}
      </button>
    </main>
  );
}
