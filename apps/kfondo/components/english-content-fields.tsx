"use client";

import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
export function EnglishContentFields<T extends FieldValues>({
  form,
  fields,
}: {
  form: UseFormReturn<T>;
  fields: { name: Path<T>; label: string }[];
}) {
  return (
    <section className="space-y-4 border-t pt-4">
      <h3 className="font-semibold">영어 번역 (선택)</h3>
      <p className="text-sm text-muted-foreground">
        비워 두면 한국어 원문을 표시합니다. 영어 SEO는 미입력 시 자동 생성합니다.
      </p>
      {fields.map(({ name, label }) => (
        <FormField
          key={name}
          control={form.control}
          name={name}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{label}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={typeof field.value === "string" ? field.value : ""}
                  lang="en"
                  rows={2}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
    </section>
  );
}
