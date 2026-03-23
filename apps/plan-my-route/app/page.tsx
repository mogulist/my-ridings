import { auth } from "@/auth";
import HeaderAuth from "./components/HeaderAuth";
import RouteList from "./components/RouteList";
import Link from "next/link";

export default async function Home() {
	const session = await auth();

	return (
		<div className="flex h-screen flex-col overflow-hidden bg-zinc-50 dark:bg-black/95">
			{/* Top toolbar */}
			<header className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
				<div className="flex items-center gap-4">
					<div className="flex h-8 w-8 items-center justify-center rounded bg-zinc-200 dark:bg-zinc-700">
						<span className="text-sm">🚴</span>
					</div>
					<span className="font-semibold text-zinc-900 dark:text-zinc-100">
						Plan My Route
					</span>
				</div>
				<div className="flex items-center gap-2">
					<HeaderAuth />
				</div>
			</header>

			{/* Main content */}
			<main className="flex-1 overflow-y-auto">
				{!session ? (
					<div className="flex h-full flex-col items-center justify-center p-6 text-center">
						<div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-3xl dark:bg-blue-900/30">
							🗺️
						</div>
						<h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
							자전거 여행 경로를 설계하세요
						</h1>
						<p className="mb-8 max-w-md text-zinc-500 dark:text-zinc-400">
							RideWithGPS 경로를 불러오고 나만의 플랜과 스테이지를 구분해
							체계적인 라이딩 여정을 계획할 수 있습니다. 경로 저장을 위해 로그인이
							필요합니다.
						</p>

						<Link
							href="/signin?callbackUrl=%2F"
							className="w-full max-w-xs rounded-md border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
						>
							로그인
						</Link>
					</div>
				) : (
					<RouteList />
				)}
			</main>
		</div>
	);
}
