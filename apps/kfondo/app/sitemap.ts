import type { MetadataRoute } from "next";
import { getAllEvents } from "@/lib/db/events";
import { routing } from "@/i18n/routing";
import { pageAlternates } from "@/i18n/urls";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events = await getAllEvents();
  return ["/", ...events.map((e) => `/${e.id}`)].flatMap((path) =>
    routing.locales.map((locale) => {
      const { canonical, languages } = pageAlternates(path, locale);
      return {
        url: canonical,
        lastModified: new Date(),
        changeFrequency: path === "/" ? ("daily" as const) : ("weekly" as const),
        priority: path === "/" ? 1 : 0.8,
        alternates: { languages },
      };
    }),
  );
}
