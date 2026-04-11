import { Suspense } from "react";
import SignInPageClient from "./SignInPageClient";

function SignInFallback() {
	return (
		<div className="flex h-screen flex-col bg-zinc-50 dark:bg-black">
			<header className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-black">
				<div className="flex items-center gap-3">
					<div className="flex h-8 w-8 items-center justify-center rounded bg-zinc-200 dark:bg-zinc-700">
						<span className="text-sm">🚴</span>
					</div>
					<span className="font-semibold text-zinc-900 dark:text-zinc-100">
						Plan My Route
					</span>
				</div>
			</header>
			<main className="flex flex-1 items-center justify-center p-6">
				<p className="text-sm text-zinc-500 dark:text-zinc-400">로딩 중…</p>
			</main>
		</div>
	);
}

export default function SignInPage() {
	return (
		<Suspense fallback={<SignInFallback />}>
			<SignInPageClient />
		</Suspense>
	);
}
