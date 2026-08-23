"use client";

export default function EventError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="container mx-auto flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <h1 className="text-xl font-semibold">일시적으로 페이지를 불러오지 못했습니다</h1>
      <p className="text-muted-foreground text-sm">
        잠시 후 다시 시도해 주세요. 문제가 계속되면 관리자에게 문의해 주세요.
      </p>
      <button
        onClick={() => reset()}
        className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
      >
        다시 시도
      </button>
    </main>
  );
}
