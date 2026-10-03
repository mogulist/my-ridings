import { getFilteredEvents } from "@/app/eventFilter";
import { HomePageContent } from "@/components/HomePageContent";

/** 30일 (Next.js segment config는 리터럴만 허용) */
export const revalidate = 2592000;

import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageAlternates } from "@/i18n/urls";
export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return { alternates: pageAlternates("/", locale) };
}
const HomePage = async ({ params }: { params: Promise<{ locale: Locale }> }) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const initialData = await getFilteredEvents(locale);

  return <HomePageContent initialData={initialData} />;
};

export default HomePage;
