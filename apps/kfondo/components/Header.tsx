"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
const Header = () => {
  const t = useTranslations();

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            {/* Logo Icon - Bicycle on Mountain */}
            <div className="relative w-10 h-10">
              <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
                {/* Simplified Taegeuk circle */}
                <circle
                  cx="20"
                  cy="20"
                  r="14"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  fill="none"
                  className="transition-colors group-hover:stroke-emerald-600"
                />
                <path
                  d="M 20 6 A 14 14 0 0 1 20 34"
                  fill="#10b981"
                  fillOpacity="0.3"
                  className="transition-colors group-hover:fill-emerald-600"
                />
                {/* Bike wheels inside */}
                <circle
                  cx="15"
                  cy="24"
                  r="4"
                  stroke="#059669"
                  strokeWidth="1.5"
                  fill="none"
                  className="transition-colors group-hover:stroke-emerald-700"
                />
                <circle
                  cx="25"
                  cy="24"
                  r="4"
                  stroke="#059669"
                  strokeWidth="1.5"
                  fill="none"
                  className="transition-colors group-hover:stroke-emerald-700"
                />
                <path
                  d="M15 24 L20 16 L25 24"
                  stroke="#059669"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-colors group-hover:stroke-emerald-700"
                />
              </svg>
            </div>

            {/* Logo Text */}
            <div className="flex flex-col">
              <span className="text-xl font-sans font-bold tracking-tight text-gray-900 dark:text-gray-100 group-hover:text-emerald-600 transition-colors">
                K-Fondo
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                {t("common.tagline")}
              </span>
            </div>
          </Link>

          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
};

export default Header;
