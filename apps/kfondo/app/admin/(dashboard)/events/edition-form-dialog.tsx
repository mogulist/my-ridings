"use client";

import { useEffect, useRef, useState } from "react";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Database, EventEditionRow } from "@/lib/database.types";
import { EDITION_STATUS_LABELS } from "./types";
import { Loader2 } from "lucide-react";

const editionSchema = z.object({
  year: z.coerce.number().min(2000).max(2100),
  date: z.string().min(1, "개최일을 입력하세요"),
  status: z.enum(["upcoming", "completed", "ready", "preparing", "cancelled"]),
  url: z.string().optional(),
  records_blob_url: z.string().optional(),
  sorted_records_blob_url: z.string().optional(),
  kom_records_blob_url: z.string().optional(),
  kom_sorted_records_blob_url: z.string().optional(),
  comment: z.string().optional(),
  notice: z.string().optional(),
});

type EditionFormValues = z.infer<typeof editionSchema>;
type EventEditionUpdate = Database["public"]["Tables"]["event_editions"]["Update"];
type EventEditionInsert = Database["public"]["Tables"]["event_editions"]["Insert"];

type EditionFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  edition?: EventEditionRow | null;
  onSuccess: () => void;
};

export function EditionFormDialog({
  open,
  onOpenChange,
  eventId,
  edition,
  onSuccess,
}: EditionFormDialogProps) {
  const supabase = createClient();
  const [recordsFile, setRecordsFile] = useState<File | null>(null);
  const [sortedRecordsFile, setSortedRecordsFile] = useState<File | null>(null);
  const [komRecordsFile, setKomRecordsFile] = useState<File | null>(null);
  const [komSortedRecordsFile, setKomSortedRecordsFile] = useState<File | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const recordsFileInputRef = useRef<HTMLInputElement | null>(null);
  const sortedRecordsFileInputRef = useRef<HTMLInputElement | null>(null);
  const komRecordsFileInputRef = useRef<HTMLInputElement | null>(null);
  const komSortedRecordsFileInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<EditionFormValues>({
    resolver: zodResolver(editionSchema),
    defaultValues: {
      year: new Date().getFullYear(),
      date: "",
      status: "upcoming",
      url: "",
      records_blob_url: "",
      sorted_records_blob_url: "",
      kom_records_blob_url: "",
      kom_sorted_records_blob_url: "",
      comment: "",
      notice: "",
    },
  });
  const recordsBlobUrl = form.watch("records_blob_url");
  const sortedRecordsBlobUrl = form.watch("sorted_records_blob_url");
  const komRecordsBlobUrl = form.watch("kom_records_blob_url");
  const komSortedRecordsBlobUrl = form.watch("kom_sorted_records_blob_url");

  useEffect(() => {
    if (open && edition) {
      const dateStr = edition.date;
      form.reset({
        year: edition.year,
        date: dateStr,
        status: edition.status,
        url: edition.url ?? "",
        records_blob_url: edition.records_blob_url ?? "",
        sorted_records_blob_url: edition.sorted_records_blob_url ?? "",
        kom_records_blob_url: edition.kom_records_blob_url ?? "",
        kom_sorted_records_blob_url:
          edition.kom_sorted_records_blob_url ?? "",
        comment: edition.comment ?? "",
        notice: edition.notice ?? "",
      });
      setRecordsFile(null);
      setSortedRecordsFile(null);
      setKomRecordsFile(null);
      setKomSortedRecordsFile(null);
    } else if (open && !edition) {
      form.reset({
        year: new Date().getFullYear(),
        date: "",
        status: "upcoming",
        url: "",
        records_blob_url: "",
        sorted_records_blob_url: "",
        kom_records_blob_url: "",
        kom_sorted_records_blob_url: "",
        comment: "",
        notice: "",
      });
      setRecordsFile(null);
      setSortedRecordsFile(null);
      setKomRecordsFile(null);
      setKomSortedRecordsFile(null);
    }
  }, [open, edition, form]);

  async function onSubmit(values: EditionFormValues) {
    setIsSaving(true);
    try {
      if (
        !edition &&
        (recordsFile ||
          sortedRecordsFile ||
          komRecordsFile ||
          komSortedRecordsFile)
      ) {
        throw new Error(
          "에디션을 먼저 생성한 뒤, 수정 모드에서 JSON 파일을 업로드해 주세요."
        );
      }

      let editionId = edition?.id;
      if (edition) {
        const payload: EventEditionUpdate = {
          year: values.year,
          date: values.date,
          status: values.status,
          url: values.url || null,
          records_blob_url: values.records_blob_url || null,
          sorted_records_blob_url: values.sorted_records_blob_url || null,
          kom_records_blob_url: values.kom_records_blob_url || null,
          kom_sorted_records_blob_url:
            values.kom_sorted_records_blob_url || null,
          comment: values.comment || null,
          notice: values.notice || null,
        };

        const { error } = await supabase
          .from("event_editions")
          .update(payload as never)
          .eq("id", edition.id);

        if (error) throw error;
      } else {
        const payload: EventEditionInsert = {
          event_id: eventId,
          year: values.year,
          date: values.date,
          status: values.status,
          url: values.url || null,
          records_blob_url: values.records_blob_url || null,
          sorted_records_blob_url: values.sorted_records_blob_url || null,
          kom_records_blob_url: values.kom_records_blob_url || null,
          kom_sorted_records_blob_url:
            values.kom_sorted_records_blob_url || null,
          comment: values.comment || null,
          notice: values.notice || null,
        };

        const { data, error } = await supabase
          .from("event_editions")
          .insert(payload as never)
          .select("id")
          .single();

        if (error) throw error;
        const insertedEdition = data as unknown as { id?: string } | null;
        if (!insertedEdition?.id) {
          throw new Error("에디션 생성 결과를 확인할 수 없습니다.");
        }
        editionId = insertedEdition.id;
      }

      if (
        (recordsFile ||
          sortedRecordsFile ||
          komRecordsFile ||
          komSortedRecordsFile) &&
        editionId
      ) {
        const uploadFormData = new FormData();
        if (recordsFile) uploadFormData.append("recordsFile", recordsFile);
        if (sortedRecordsFile)
          uploadFormData.append("sortedRecordsFile", sortedRecordsFile);
        if (komRecordsFile)
          uploadFormData.append("komRecordsFile", komRecordsFile);
        if (komSortedRecordsFile)
          uploadFormData.append("komSortedRecordsFile", komSortedRecordsFile);

        const response = await fetch(
          `/api/admin/event-editions/${editionId}/records-upload`,
          {
            method: "POST",
            body: uploadFormData,
          }
        );
        const payload = (await response.json()) as {
          error?: string;
          recordsBlobUrl?: string;
          sortedRecordsBlobUrl?: string;
          komRecordsBlobUrl?: string;
          komSortedRecordsBlobUrl?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "파일 업로드에 실패했습니다.");
        }

        if (payload.recordsBlobUrl) {
          form.setValue("records_blob_url", payload.recordsBlobUrl);
        }
        if (payload.sortedRecordsBlobUrl) {
          form.setValue("sorted_records_blob_url", payload.sortedRecordsBlobUrl);
        }
        if (payload.komRecordsBlobUrl) {
          form.setValue("kom_records_blob_url", payload.komRecordsBlobUrl);
        }
        if (payload.komSortedRecordsBlobUrl) {
          form.setValue(
            "kom_sorted_records_blob_url",
            payload.komSortedRecordsBlobUrl
          );
        }
      }

      toast.success("에디션이 저장되었습니다.");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  const clearRecordsInput = () => {
    setRecordsFile(null);
    form.setValue("records_blob_url", "", { shouldDirty: true });
    if (recordsFileInputRef.current) recordsFileInputRef.current.value = "";
  };

  const clearSortedRecordsInput = () => {
    setSortedRecordsFile(null);
    form.setValue("sorted_records_blob_url", "", { shouldDirty: true });
    if (sortedRecordsFileInputRef.current) sortedRecordsFileInputRef.current.value = "";
  };

  const clearKomRecordsInput = () => {
    setKomRecordsFile(null);
    form.setValue("kom_records_blob_url", "", { shouldDirty: true });
    if (komRecordsFileInputRef.current) komRecordsFileInputRef.current.value = "";
  };

  const clearKomSortedRecordsInput = () => {
    setKomSortedRecordsFile(null);
    form.setValue("kom_sorted_records_blob_url", "", { shouldDirty: true });
    if (komSortedRecordsFileInputRef.current)
      komSortedRecordsFileInputRef.current.value = "";
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isSaving) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="flex max-h-[80dvh] min-h-0 max-w-lg flex-col gap-4 overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {edition ? "에디션 편집" : "새 에디션 추가"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden"
          >
            <fieldset
              disabled={isSaving}
              className="min-h-0 flex-1 overflow-hidden border-0 p-0 m-0"
            >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-1 pb-1">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>연도 *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={2000}
                        max={2100}
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>개최일 *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>상태 *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="상태 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(
                        Object.keys(EDITION_STATUS_LABELS) as Array<
                          keyof typeof EDITION_STATUS_LABELS
                        >
                      ).map((key) => (
                        <SelectItem key={key} value={key}>
                          {EDITION_STATUS_LABELS[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>대회 URL</FormLabel>
                  <FormControl>
                    <Input
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
              name="records_blob_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>원본 기록 파일 URL</FormLabel>
                  <div className="flex items-start gap-2">
                    <FormControl>
                      <Input
                        placeholder="https://..."
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!edition || isSaving}
                      onClick={() => recordsFileInputRef.current?.click()}
                    >
                      업로드
                    </Button>
                    {recordsBlobUrl || recordsFile ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSaving}
                        onClick={clearRecordsInput}
                      >
                        삭제
                      </Button>
                    ) : null}
                  </div>
                  <input
                    ref={recordsFileInputRef}
                    className="hidden"
                    type="file"
                    accept=".json,application/json"
                    disabled={!edition || isSaving}
                    onChange={(event) => {
                      setRecordsFile(event.target.files?.[0] ?? null);
                    }}
                  />
                  {recordsFile ? (
                    <p className="text-sm text-muted-foreground">
                      선택 파일: {recordsFile.name}
                    </p>
                  ) : null}
                  {!edition ? (
                    <p className="text-sm text-muted-foreground">
                      에디션을 먼저 저장한 뒤 편집에서 업로드할 수 있습니다.
                    </p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sorted_records_blob_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>정렬된 기록 파일 URL</FormLabel>
                  <div className="flex items-start gap-2">
                    <FormControl>
                      <Input
                        placeholder="https://..."
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!edition || isSaving}
                      onClick={() => sortedRecordsFileInputRef.current?.click()}
                    >
                      업로드
                    </Button>
                    {sortedRecordsBlobUrl || sortedRecordsFile ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSaving}
                        onClick={clearSortedRecordsInput}
                      >
                        삭제
                      </Button>
                    ) : null}
                  </div>
                  <input
                    ref={sortedRecordsFileInputRef}
                    className="hidden"
                    type="file"
                    accept=".json,application/json"
                    disabled={!edition || isSaving}
                    onChange={(event) => {
                      setSortedRecordsFile(event.target.files?.[0] ?? null);
                    }}
                  />
                  {sortedRecordsFile ? (
                    <p className="text-sm text-muted-foreground">
                      선택 파일: {sortedRecordsFile.name}
                    </p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="kom_records_blob_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>KOM 원본 기록 파일 URL</FormLabel>
                  <div className="flex items-start gap-2">
                    <FormControl>
                      <Input
                        placeholder="https://..."
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!edition || isSaving}
                      onClick={() => komRecordsFileInputRef.current?.click()}
                    >
                      업로드
                    </Button>
                    {komRecordsBlobUrl || komRecordsFile ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSaving}
                        onClick={clearKomRecordsInput}
                      >
                        삭제
                      </Button>
                    ) : null}
                  </div>
                  <input
                    ref={komRecordsFileInputRef}
                    className="hidden"
                    type="file"
                    accept=".json,application/json"
                    disabled={!edition || isSaving}
                    onChange={(event) => {
                      setKomRecordsFile(event.target.files?.[0] ?? null);
                    }}
                  />
                  {komRecordsFile ? (
                    <p className="text-sm text-muted-foreground">
                      선택 파일: {komRecordsFile.name}
                    </p>
                  ) : null}
                  {!edition ? (
                    <p className="text-sm text-muted-foreground">
                      에디션을 먼저 저장한 뒤 편집에서 업로드할 수 있습니다.
                    </p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="kom_sorted_records_blob_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>KOM 정렬 기록 파일 URL</FormLabel>
                  <div className="flex items-start gap-2">
                    <FormControl>
                      <Input
                        placeholder="https://..."
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!edition || isSaving}
                      onClick={() =>
                        komSortedRecordsFileInputRef.current?.click()
                      }
                    >
                      업로드
                    </Button>
                    {komSortedRecordsBlobUrl || komSortedRecordsFile ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSaving}
                        onClick={clearKomSortedRecordsInput}
                      >
                        삭제
                      </Button>
                    ) : null}
                  </div>
                  <input
                    ref={komSortedRecordsFileInputRef}
                    className="hidden"
                    type="file"
                    accept=".json,application/json"
                    disabled={!edition || isSaving}
                    onChange={(event) => {
                      setKomSortedRecordsFile(event.target.files?.[0] ?? null);
                    }}
                  />
                  {komSortedRecordsFile ? (
                    <p className="text-sm text-muted-foreground">
                      선택 파일: {komSortedRecordsFile.name}
                    </p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>사용자 공지 (공개)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="악천후로 인해 그란폰도 코스가 취소되고 메디오폰도만 운영됩니다..."
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
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>코멘트</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="관리자용 메모..."
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>
            </fieldset>

            <DialogFooter className="shrink-0 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                취소
              </Button>
              <Button
                type="submit"
                className="bg-primary text-primary-foreground"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  "저장"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
