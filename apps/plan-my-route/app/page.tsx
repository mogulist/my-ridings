import HeaderAuth from "./components/HeaderAuth";
import KakaoMap from "./components/KakaoMap";

export default function Home() {
	return (
		<div className="flex h-screen flex-col overflow-hidden">
			{/* Top toolbar */}
			<header className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
				<div className="flex items-center gap-4">
					<div className="flex h-8 w-8 items-center justify-center rounded bg-zinc-200 dark:bg-zinc-700">
						<span className="text-sm">🚴</span>
					</div>
					<span className="font-semibold text-zinc-900 dark:text-zinc-100">Plan My Route</span>
				</div>
				<div className="flex items-center gap-2">
					<HeaderAuth />
				</div>
			</header>

			{/* Main content: left panel + map */}
			<div className="flex min-h-0 flex-1">
				{/* Left plan panel - desktop only */}
				<aside className="hidden w-80 shrink-0 flex-col overflow-y-auto border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:flex">
					<div className="space-y-4 p-4">
						<div>
							<h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
								백두대간 울트라 로드
							</h2>
							<p className="text-sm text-zinc-500 dark:text-zinc-400">By user</p>
						</div>
						<div className="flex gap-4 text-sm">
							<div>
								<span className="text-zinc-500 dark:text-zinc-400">거리</span>
								<p className="font-medium">1,269.8 km</p>
							</div>
							<div>
								<span className="text-zinc-500 dark:text-zinc-400">획득고도</span>
								<p className="font-medium">+26,666 m</p>
							</div>
							<div>
								<span className="text-zinc-500 dark:text-zinc-400">하강고도</span>
								<p className="font-medium">-26,750 m</p>
							</div>
						</div>
						<div className="rounded border border-zinc-200 p-3 dark:border-zinc-700">
							<p className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
								일자별 요약
							</p>
							<p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">(placeholder)</p>
						</div>
						<div className="rounded border border-zinc-200 p-3 dark:border-zinc-700">
							<p className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
								숙소 / 거리 / 획고
							</p>
							<p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">(placeholder)</p>
						</div>
					</div>
				</aside>

				{/* Map area */}
				<section className="relative min-h-0 flex-1">
					<div className="h-full w-full">
						<KakaoMap />
					</div>
				</section>
			</div>

			{/* Bottom elevation profile - desktop */}
			<section className="hidden h-32 shrink-0 border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 lg:block">
				<div className="flex h-full items-center justify-center">
					<p className="text-sm text-zinc-500 dark:text-zinc-400">고도 프로필 (placeholder)</p>
				</div>
			</section>

			{/* Mobile bottom sheet */}
			<div className="fixed inset-x-0 bottom-0 z-10 flex flex-col rounded-t-xl border-t border-zinc-200 bg-white shadow-lg lg:hidden">
				<div className="flex justify-center py-2">
					<div className="h-1 w-12 rounded-full bg-zinc-300 dark:bg-zinc-600" />
				</div>
				<div className="space-y-2 px-4 pb-6 pt-2">
					<p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">플랜 요약</p>
					<div className="flex gap-4 text-xs text-zinc-500 dark:text-zinc-400">
						<span>1,269.8 km</span>
						<span>+26,666 m / -26,750 m</span>
					</div>
					<p className="text-xs text-zinc-400 dark:text-zinc-500">(placeholder)</p>
				</div>
			</div>
		</div>
	);
}
