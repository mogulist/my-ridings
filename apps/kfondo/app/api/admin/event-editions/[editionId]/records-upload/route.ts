import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { buildRecordsBlobPath } from "@/lib/records-blob-path";
import { createClient } from "@/lib/supabase/server";
import { getPostHogClient } from "@/lib/posthog-server";

const MAX_SIZE_BYTES = 30 * 1024 * 1024; // 30MB

const isValidJsonFile = (file: File): boolean => {
  const type = file.type?.toLowerCase() ?? "";
  const name = file.name?.toLowerCase() ?? "";
  return type.includes("json") || name.endsWith(".json");
};

export async function POST(
  request: Request,
  context: { params: Promise<{ editionId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: adminRecord } = await supabase
    .from("admin_whitelist")
    .select("id")
    .eq("email", user.email)
    .single();

  if (!adminRecord) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { editionId } = await context.params;
  if (!editionId) {
    return NextResponse.json({ error: "Missing edition id" }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const recordsFile = formData.get("recordsFile");
  const sortedRecordsFile = formData.get("sortedRecordsFile");
  const komRecordsFile = formData.get("komRecordsFile");
  const komSortedRecordsFile = formData.get("komSortedRecordsFile");

  const hasAnyFile =
    (recordsFile instanceof File) ||
    (sortedRecordsFile instanceof File) ||
    (komRecordsFile instanceof File) ||
    (komSortedRecordsFile instanceof File);

  if (!hasAnyFile) {
    return NextResponse.json(
      {
        error:
          "recordsFile, sortedRecordsFile, komRecordsFile, komSortedRecordsFile 중 하나는 필요합니다.",
      },
      { status: 400 }
    );
  }

  if (recordsFile instanceof File) {
    if (!isValidJsonFile(recordsFile)) {
      return NextResponse.json(
        { error: "원본 기록 파일은 JSON이어야 합니다." },
        { status: 400 }
      );
    }
    if (recordsFile.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "원본 기록 파일 용량이 너무 큽니다. (최대 30MB)" },
        { status: 400 }
      );
    }
  }

  if (sortedRecordsFile instanceof File) {
    if (!isValidJsonFile(sortedRecordsFile)) {
      return NextResponse.json(
        { error: "정렬 기록 파일은 JSON이어야 합니다." },
        { status: 400 }
      );
    }
    if (sortedRecordsFile.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "정렬 기록 파일 용량이 너무 큽니다. (최대 30MB)" },
        { status: 400 }
      );
    }
  }

  if (komRecordsFile instanceof File) {
    if (!isValidJsonFile(komRecordsFile)) {
      return NextResponse.json(
        { error: "KOM 원본 기록 파일은 JSON이어야 합니다." },
        { status: 400 }
      );
    }
    if (komRecordsFile.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "KOM 원본 기록 파일 용량이 너무 큽니다. (최대 30MB)" },
        { status: 400 }
      );
    }
  }

  if (komSortedRecordsFile instanceof File) {
    if (!isValidJsonFile(komSortedRecordsFile)) {
      return NextResponse.json(
        { error: "KOM 정렬 기록 파일은 JSON이어야 합니다." },
        { status: 400 }
      );
    }
    if (komSortedRecordsFile.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "KOM 정렬 기록 파일 용량이 너무 큽니다. (최대 30MB)" },
        { status: 400 }
      );
    }
  }

  try {
    let recordsBlobUrl: string | undefined;
    let sortedRecordsBlobUrl: string | undefined;
    let komRecordsBlobUrl: string | undefined;
    let komSortedRecordsBlobUrl: string | undefined;

    if (recordsFile instanceof File) {
      const blob = await put(buildRecordsBlobPath(editionId, "records"), recordsFile, {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
      });
      recordsBlobUrl = blob.url;
    }

    if (sortedRecordsFile instanceof File) {
      const blob = await put(
        buildRecordsBlobPath(editionId, "sorted-records"),
        sortedRecordsFile,
        {
          access: "public",
          contentType: "application/json",
          addRandomSuffix: false,
        }
      );
      sortedRecordsBlobUrl = blob.url;
    }

    if (komRecordsFile instanceof File) {
      const blob = await put(
        buildRecordsBlobPath(editionId, "kom-records"),
        komRecordsFile,
        {
          access: "public",
          contentType: "application/json",
          addRandomSuffix: false,
        }
      );
      komRecordsBlobUrl = blob.url;
    }

    if (komSortedRecordsFile instanceof File) {
      const blob = await put(
        buildRecordsBlobPath(editionId, "kom-sorted-records"),
        komSortedRecordsFile,
        {
          access: "public",
          contentType: "application/json",
          addRandomSuffix: false,
        }
      );
      komSortedRecordsBlobUrl = blob.url;
    }

    const patch: {
      records_blob_url?: string;
      sorted_records_blob_url?: string;
      kom_records_blob_url?: string;
      kom_sorted_records_blob_url?: string;
    } = {};
    if (recordsBlobUrl) patch.records_blob_url = recordsBlobUrl;
    if (sortedRecordsBlobUrl) patch.sorted_records_blob_url = sortedRecordsBlobUrl;
    if (komRecordsBlobUrl) patch.kom_records_blob_url = komRecordsBlobUrl;
    if (komSortedRecordsBlobUrl)
      patch.kom_sorted_records_blob_url = komSortedRecordsBlobUrl;

    const { error } = await supabase
      .from("event_editions")
      .update(patch as never)
      .eq("id", editionId);

    if (error) throw error;

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: user.email,
      event: "records_upload_completed",
      properties: {
        edition_id: editionId,
        uploaded_records: !!recordsBlobUrl,
        uploaded_sorted_records: !!sortedRecordsBlobUrl,
        uploaded_kom_records: !!komRecordsBlobUrl,
        uploaded_kom_sorted_records: !!komSortedRecordsBlobUrl,
      },
    });

    return NextResponse.json({
      recordsBlobUrl,
      sortedRecordsBlobUrl,
      komRecordsBlobUrl,
      komSortedRecordsBlobUrl,
    });
  } catch (err) {
    console.error("[event-edition-records-upload]", err);
    return NextResponse.json(
      { error: "업로드 및 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}
