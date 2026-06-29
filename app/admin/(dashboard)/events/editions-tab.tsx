"use client";

import { useState } from "react";
import { Pencil, Trash2, ExternalLink, Check } from "lucide-react";
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
import { EditionFormDialog } from "./edition-form-dialog";
import type { EventEditionWithCourses } from "./types";
import { EDITION_STATUS_LABELS, formatEditionDate } from "./types";

type EditionsTabProps = {
  eventId: string;
  eventSlug: string;
  editions: EventEditionWithCourses[];
};

const STATUS_VARIANT: Record<
  keyof typeof EDITION_STATUS_LABELS,
  "default" | "secondary" | "outline"
> = {
  upcoming: "default",
  completed: "secondary",
  ready: "outline",
  preparing: "outline",
  cancelled: "outline",
};

export function EditionsTab({
  eventId,
  eventSlug,
  editions,
}: EditionsTabProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEdition, setEditingEdition] =
    useState<EventEditionWithCourses | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<EventEditionWithCourses | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const sortedEditions = [...editions].sort((a, b) => b.year - a.year);

  function handleAdd() {
    setEditingEdition(null);
    setDialogOpen(true);
  }

  function handleEdit(edition: EventEditionWithCourses) {
    setEditingEdition(edition);
    setDialogOpen(true);
  }

  function handleDialogClose(open: boolean) {
    if (!open) setEditingEdition(null);
    setDialogOpen(open);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("event_editions")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) throw error;
      toast.success("에디션이 삭제되었습니다.");
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

  function recordsDisplay(edition: EventEditionWithCourses) {
    const hasRecords =
      edition.records_blob_url ||
      edition.sorted_records_blob_url ||
      edition.kom_records_blob_url ||
      edition.kom_sorted_records_blob_url;
    if (!hasRecords) return "-";
    const parts: string[] = [];
    if (edition.records_blob_url) parts.push("원본");
    if (edition.sorted_records_blob_url) parts.push("정렬본");
    if (edition.kom_records_blob_url) parts.push("KOM원본");
    if (edition.kom_sorted_records_blob_url) parts.push("KOM정렬");
    return parts.join(" ");
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="mb-4 flex justify-end">
        <Button onClick={handleAdd} size="sm" variant="outline">
          + 새 에디션 추가
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>연도</TableHead>
            <TableHead>개최일</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>URL</TableHead>
            <TableHead>기록 파일</TableHead>
            <TableHead>공지</TableHead>
            <TableHead>코멘트</TableHead>
            <TableHead className="w-[100px]">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEditions.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="text-center text-muted-foreground"
              >
                에디션이 없습니다.
              </TableCell>
            </TableRow>
          ) : (
            sortedEditions.map((edition) => (
              <TableRow key={edition.id}>
                <TableCell>{edition.year}</TableCell>
                <TableCell>{formatEditionDate(edition.date)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[edition.status]}>
                    {EDITION_STATUS_LABELS[edition.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {edition.url ? (
                    <a
                      href={edition.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      링크 <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>{recordsDisplay(edition)}</TableCell>
                <TableCell>
                  {edition.notice && (
                    <Check className="h-4 w-4 text-blue-500" />
                  )}
                </TableCell>
                <TableCell>
                  {edition.comment && (
                    <Check className="h-4 w-4 text-muted-foreground" />
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(edition)}
                      aria-label="수정"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(edition)}
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

      <EditionFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        eventId={eventId}
        edition={editingEdition}
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
            <AlertDialogTitle>에디션 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 에디션과 연결된 코스 정보가 모두 삭제됩니다. 계속하시겠습니까?
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
