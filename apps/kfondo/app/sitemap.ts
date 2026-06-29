import { MetadataRoute } from "next";
import { getAllEvents } from "@/lib/db/events";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://kfondo.cc";

  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  const events = await getAllEvents();
  const eventRoutes: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${baseUrl}/${event.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...routes, ...eventRoutes];
}
