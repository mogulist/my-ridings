"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  revalidateHomePage,
  revalidateEventPage,
} from "@/app/actions/revalidate";
import { toast } from "sonner";
import { CourseFormDialog } from "./course-form-dialog";
import type { EventEditionWithCourses } from "./types";
import type { CourseRow } from "@/lib/database.types";

type CoursesTabProps = {
  eventSlug: string;
  editions: EventEditionWithCourses[];
};

export function CoursesTab({ eventSlug, editions }: CoursesTabProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CourseRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const sortedEditions = [...editions].sort((a, b) => b.year - a.year);

  function handleAdd() {
    setEditingCourse(null);
    setDialogOpen(true);
  }

  function handleEdit(course: CourseRow) {
    setEditingCourse(course);
    setDialogOpen(true);
  }

  function handleDialogClose(open: boolean) {
    if (!open) setEditingCourse(null);
    setDialogOpen(open);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) throw error;
      toast.success("코스가 삭제되었습니다.");
      setDeleteTarget(null);
      await revalidateEventPage(eventSlug);
      await revalidateHomePage();
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="mb-4 flex justify-end">
        <Button onClick={handleAdd} variant="outline" size="sm">
          + 새 코스 추가
        </Button>
      </div>

      <div className="space-y-8">
        {sortedEditions.length === 0 ? (
          <p className="text-center text-muted-foreground">
            에디션이 없습니다. 개최 정보에서 에디션을 먼저 추가하세요.
          </p>
        ) : (
          sortedEditions.map((edition) => (
            <section key={edition.id}>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-lg font-semibold">{edition.year}년</h3>
                <Badge variant="secondary">
                  {edition.courses.length}개 코스
                </Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>코스 타입</TableHead>
                    <TableHead>코스명</TableHead>
                    <TableHead>거리 (km)</TableHead>
                    <TableHead>고도 (m)</TableHead>
                    <TableHead>접수 인원</TableHead>
                    <TableHead className="w-[72px] text-center">KOM</TableHead>
                    <TableHead className="w-[100px]">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {edition.courses.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground"
                      >
                        코스가 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    edition.courses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell>
                          <Badge variant="secondary">
                            {course.course_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{course.name}</TableCell>
                        <TableCell>{course.distance}</TableCell>
                        <TableCell>
                          {course.elevation.toLocaleString()}
                        </TableCell>
                        <TableCell>{course.registered_count}명</TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {course.has_kom ? "○" : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(course)}
                              aria-label="수정"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTarget(course)}
                              aria-label="삭제"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </section>
          ))
        )}
      </div>

      <CourseFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editions={sortedEditions}
        course={editingCourse}
        onSuccess={async () => {
          await revalidateEventPage(eventSlug);
          await revalidateHomePage();
          router.refresh();
        }}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>코스 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 코스를 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
