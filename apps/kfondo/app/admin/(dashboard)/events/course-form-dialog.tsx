"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type {
  CourseRow,
  Database,
} from "@/lib/database.types";
import type { EventEditionWithCourses } from "./types";

type CourseInsert = Database["public"]["Tables"]["courses"]["Insert"];
type CourseUpdate = Database["public"]["Tables"]["courses"]["Update"];

const courseSchema = z.object({
  edition_id: z.string().uuid("에디션을 선택하세요"),
  course_type: z.string().min(1, "코스 타입을 입력하세요"),
  name: z.string().min(1, "코스명을 입력하세요"),
  distance: z.coerce.number().min(0),
  elevation: z.coerce.number().min(0),
  registered_count: z.coerce.number().min(0).optional(),
  official_site_url: z.string().optional(),
  strava_url: z.string().optional(),
  ride_with_gps_url: z.string().optional(),
  gpx_blob_url: z.string().optional(),
  has_kom: z.boolean().optional(),
});

type CourseFormValues = z.infer<typeof courseSchema>;

type CourseFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editions: EventEditionWithCourses[];
  course?: CourseRow | null;
  onSuccess: () => void;
};

export function CourseFormDialog({
  open,
  onOpenChange,
  editions,
  course,
  onSuccess,
}: CourseFormDialogProps) {
  const supabase = createClient();
  const sortedEditions = useMemo(
    () => [...editions].sort((a, b) => b.year - a.year),
    [editions]
  );

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      edition_id: "",
      course_type: "",
      name: "",
      distance: 0,
      elevation: 0,
      registered_count: 0,
      official_site_url: "",
      strava_url: "",
      ride_with_gps_url: "",
      gpx_blob_url: "",
      has_kom: false,
    },
  });

  const [gpxUploading, setGpxUploading] = useState(false);

  useEffect(() => {
    if (open && course) {
      form.reset({
        edition_id: course.edition_id,
        course_type: course.course_type,
        name: course.name,
        distance: course.distance,
        elevation: course.elevation,
        registered_count: course.registered_count ?? 0,
        official_site_url: course.official_site_url ?? "",
        strava_url: course.strava_url ?? "",
        ride_with_gps_url: course.ride_with_gps_url ?? "",
        gpx_blob_url: course.gpx_blob_url ?? "",
        has_kom: course.has_kom === true,
      });
    } else if (open && sortedEditions.length > 0) {
      form.reset({
        edition_id: sortedEditions[0]?.id ?? "",
        course_type: "",
        name: "",
        distance: 0,
        elevation: 0,
        registered_count: 0,
        official_site_url: "",
        strava_url: "",
        ride_with_gps_url: "",
        gpx_blob_url: "",
        has_kom: false,
      });
    }
  }, [open, course, sortedEditions, form]);

  async function onSubmit(values: CourseFormValues) {
    if (
      hasDuplicateCourse(
        editions,
        values.edition_id,
        values.course_type,
        values.name,
        course?.id
      )
    ) {
      toast.error("이 에디션에 동일한 코스 타입과 코스명이 이미 있습니다.");
      return;
    }

    try {
      if (course) {
        const payload: CourseUpdate = {
          edition_id: values.edition_id,
          course_type: values.course_type,
          name: values.name,
          distance: values.distance,
          elevation: values.elevation,
          registered_count: values.registered_count ?? 0,
          official_site_url: values.official_site_url?.trim() || null,
          strava_url: values.strava_url?.trim() || null,
          ride_with_gps_url: values.ride_with_gps_url?.trim() || null,
          gpx_blob_url: values.gpx_blob_url?.trim() || null,
          has_kom: values.has_kom === true,
        };
        const { error } = await supabase
          .from("courses")
          .update(payload as never)
          .eq("id", course.id);

        if (error) throw error;
        toast.success("코스가 수정되었습니다.");
      } else {
        const payload: CourseInsert = {
          edition_id: values.edition_id,
          course_type: values.course_type,
          name: values.name,
          distance: values.distance,
          elevation: values.elevation,
          registered_count: values.registered_count ?? 0,
          official_site_url: values.official_site_url?.trim() || null,
          strava_url: values.strava_url?.trim() || null,
          ride_with_gps_url: values.ride_with_gps_url?.trim() || null,
          gpx_blob_url: values.gpx_blob_url?.trim() || null,
          has_kom: values.has_kom === true,
        };
        const { error } = await supabase
          .from("courses")
          .insert(payload as never);

        if (error) throw error;
        toast.success("코스가 추가되었습니다.");
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("저장에 실패했습니다.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80dvh] min-h-0 max-w-lg flex-col gap-4 overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{course ? "코스 편집" : "새 코스 추가"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden"
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-1 pb-1">
            <FormField
              control={form.control}
              name="edition_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>에디션 *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={Boolean(course)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="에디션 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sortedEditions.map((ed) => (
                        <SelectItem key={ed.id} value={ed.id}>
                          {ed.year}년
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="course_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>코스 타입 *</FormLabel>
                    <FormControl>
                      <Input placeholder="granfondo" {...field} />
                    </FormControl>
                    <FormDescription>
                      ID로 사용됩니다 (예: granfondo)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>코스명 *</FormLabel>
                    <FormControl>
                      <Input placeholder="그란폰도" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="distance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>거리 (km) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step={0.1}
                        min={0}
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.valueAsNumber || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="elevation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>고도 (m) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.valueAsNumber || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="registered_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>접수 인원</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      value={field.value ?? 0}
                      onChange={(e) =>
                        field.onChange(e.target.valueAsNumber ?? 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="has_kom"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>KOM 구간 기록</FormLabel>
                    <FormDescription>
                      에디션에 KOM 기록 파일이 있을 때, 이 코스에만 [전체/KOM]
                      전환이 표시됩니다.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value === true}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="space-y-3 border-t pt-4">
              <h4 className="text-sm font-medium text-muted-foreground">
                링크 (선택)
              </h4>
              <FormField
                control={form.control}
                name="official_site_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>공식 사이트 URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://..."
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="strava_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Strava URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://www.strava.com/..."
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ride_with_gps_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RideWithGPS URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://ridewithgps.com/..."
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3 border-t pt-4">
              <h4 className="text-sm font-medium text-muted-foreground">
                경로 (네이버맵)
              </h4>
              <FormField
                control={form.control}
                name="gpx_blob_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GPX 파일</FormLabel>
                    {field.value ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          현재 경로 있음
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => field.onChange("")}
                        >
                          삭제
                        </Button>
                      </div>
                    ) : null}
                    <FormControl>
                      <Input
                        type="file"
                        accept=".gpx,application/gpx+xml,application/xml,text/xml"
                        disabled={gpxUploading}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setGpxUploading(true);
                          try {
                            const fd = new FormData();
                            fd.set("file", f);
                            const res = await fetch("/api/courses/gpx-upload", {
                              method: "POST",
                              body: fd,
                            });
                            if (!res.ok) {
                              const data = await res.json().catch(() => ({}));
                              throw new Error(data.error ?? "업로드 실패");
                            }
                            const { url } = await res.json();
                            field.onChange(url);
                            toast.success("GPX가 업로드되었습니다.");
                          } catch (err) {
                            toast.error(
                              err instanceof Error ? err.message : "업로드 실패"
                            );
                          } finally {
                            setGpxUploading(false);
                            e.target.value = "";
                          }
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      GPX 업로드 시 이벤트 상세에서 네이버맵 버튼이 활성화됩니다.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            </div>

            <DialogFooter className="shrink-0 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                취소
              </Button>
              <Button
                type="submit"
                className="bg-primary text-primary-foreground"
              >
                저장
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function hasDuplicateCourse(
  editions: EventEditionWithCourses[],
  editionId: string,
  courseType: string,
  name: string,
  excludeCourseId?: string
): boolean {
  const edition = editions.find((ed) => ed.id === editionId);
  if (!edition) return false;

  const normalizedType = courseType.trim();
  const normalizedName = name.trim();

  return edition.courses.some(
    (existingCourse) =>
      existingCourse.id !== excludeCourseId &&
      existingCourse.course_type.trim() === normalizedType &&
      existingCourse.name.trim() === normalizedName
  );
}
