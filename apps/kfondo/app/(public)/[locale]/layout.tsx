import type React from "react";
import "@/app/globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { SITE_URL } from "@/i18n/urls";
import { AppProviders } from "@/components/app-providers";
import { Footer } from "@/components/footer";
import { AnalyticsWithExclusions } from "@/components/analytics-with-exclusions";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { LocaleAnalytics } from "@/components/locale-analytics";
const inter = Inter({ subsets: ["latin"] });
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  return {
    metadataBase: new URL(SITE_URL),
    title: t("title"),
    description: t("description"),
    authors: [{ name: "K-Fondo" }],
    creator: "K-Fondo",
    publisher: "K-Fondo",
    formatDetection: { email: false, address: false, telephone: false },
    openGraph: {
      title: t("title"),
      description: t("description"),
      siteName: "K-Fondo",
      locale: locale === "en" ? "en_US" : "ko_KR",
      type: "website",
    },
    twitter: { card: "summary_large_image", title: t("title"), description: t("description") },
    robots: { index: true, follow: true },
    verification: { google: "K_bu_gyZtuD8AhOPED0z9esyUAghuqnGV94sC0HoZx4" },
    other: { "naver-site-verification": "c42c853d3e698f688ace54aabfdd111ad8d50c30" },
  };
}
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1 };
export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>
        <NextIntlClientProvider>
          <AppProviders>
            <div className="min-h-screen bg-background">
              {children}
              <Footer />
            </div>
            <LocaleAnalytics />
            <AnalyticsWithExclusions />
            <SpeedInsights />
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
