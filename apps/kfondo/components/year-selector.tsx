"use client";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { useMobile } from "@/hooks/use-mobile";

interface YearSelectorProps {
  years: number[];
  defaultYear: number;
}

export function YearSelector({ years, defaultYear }: YearSelectorProps) {
  const t = useTranslations();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useMobile();

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(name, value);
      return params.toString();
    },
    [searchParams],
  );

  const selectedYear = searchParams.get("year") || defaultYear.toString();

  const sortedYears = [...years].sort((a, b) => b - a);

  return (
    <div className="flex items-center gap-2 w-full sm:w-auto">
      {!isMobile && (
        <div className="hidden md:flex gap-2">
          {sortedYears.map((year) => (
            <Button
              key={year}
              variant={year.toString() === selectedYear ? "default" : "outline"}
              size="sm"
              onClick={() => {
                router.push(`${pathname}?${createQueryString("year", year.toString())}`);
              }}
            >
              {year}
            </Button>
          ))}
        </div>
      )}

      <div className={isMobile ? "w-full" : "md:hidden"}>
        <Select
          value={selectedYear}
          onValueChange={(value) => {
            router.push(`${pathname}?${createQueryString("year", value)}`);
          }}
        >
          <SelectTrigger className={isMobile ? "w-full" : "w-[100px]"}>
            <SelectValue placeholder={t("event.selectYear")} />
          </SelectTrigger>
          <SelectContent>
            {sortedYears.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {t("common.year", { v0: year })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
