import HeaderAuth from "@/app/components/HeaderAuth";
import RouteViewer from "@/app/components/RouteViewer";
import Link from "next/link";
import { auth } from "@/auth";

export default async function RouteDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const session = await auth();
	const { id } = await params;

	// Note: Authentication is enforced on the API layer, but we can also handle it here.

	return (
		<div className="flex h-screen flex-col overflow-hidden">
			{/* Top toolbar */}
			<header className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
				<div className="flex items-center gap-4">
					<Link
						href="/"
						className="flex h-8 w-8 items-center justify-center rounded bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors"
					>
						<span className="text-sm">←</span>
					</Link>
					<span className="font-semibold text-zinc-900 dark:text-zinc-100">
						Plan My Route {session ? "" : "- 보기 전용"}
					</span>
				</div>
				<div className="flex items-center gap-2">
					<HeaderAuth />
				</div>
			</header>

			{/* Main content: sidebar + (map & elevation) */}
			<div className="flex min-h-0 flex-1">
				<RouteViewer routeId={id} />
			</div>

			{/* Mobile bottom sheet */}
			<div className="fixed inset-x-0 bottom-0 z-10 flex flex-col rounded-t-xl border-t border-zinc-200 bg-white shadow-lg lg:hidden">
				<div className="flex justify-center py-2">
					<div className="h-1 w-12 rounded-full bg-zinc-300 dark:bg-zinc-600" />
				</div>
				<div className="space-y-2 px-4 pb-6 pt-2">
					<p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
						플랜 요약
					</p>
					<p className="text-xs text-zinc-400 dark:text-zinc-500">(placeholder)</p>
				</div>
			</div>
		</div>
	);
}
