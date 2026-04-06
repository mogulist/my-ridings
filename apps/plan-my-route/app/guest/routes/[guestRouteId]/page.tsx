import Link from "next/link";
import HeaderAuth from "@/app/components/HeaderAuth";
import RouteViewer from "@/app/components/RouteViewer";

type GuestRoutePageProps = {
  params: Promise<{ guestRouteId: string }>;
};

export default async function GuestRoutePage({ params }: GuestRoutePageProps) {
  const { guestRouteId } = await params;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded bg-zinc-200 transition-colors hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600"
          >
            <span className="text-sm">←</span>
          </Link>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            Guest 플랜 편집
          </span>
        </div>
        <div className="flex items-center gap-2">
          <HeaderAuth />
        </div>
      </header>
      <div className="shrink-0 border-b border-orange-200 bg-orange-50 px-4 py-2 text-xs text-orange-900 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-100">
        현재 내용은 이 브라우저에만 저장됩니다. 로그인하면 계정에 플랜을 저장하고 공유할 수 있어요.
      </div>
      <main className="flex min-h-0 flex-1">
        <RouteViewer routeId={guestRouteId} mode="guest" />
      </main>
    </div>
  );
}
